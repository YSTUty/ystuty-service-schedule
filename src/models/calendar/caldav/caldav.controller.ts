import {
  All,
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Request, Response } from 'express';

import { Public } from '@my-common';

import { MetricsService } from '../../metrics/metrics.service';
import { CalendarService } from '../calendar.service';

import { CalDavBasicAuthGuard } from './caldav-basic-auth.guard';
import { CalDavService } from './caldav.service';

/**
 * Read-only CalDAV-совместимый endpoint для календарей групп и преподавателей.
 */
@ApiExcludeController()
@Public()
@UseGuards(CalDavBasicAuthGuard)
@Controller('/calendar/caldav')
export class CalDavController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly calDavService: CalDavService,
    private readonly metricsService: MetricsService,
  ) {}

  @All(['group/:groupName', 'group/:groupName/:resource'])
  @Version('1')
  async handleGroupRequest(
    @Param('groupName') groupName: string,
    @Param('resource') resource: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleRequest(
      {
        type: 'group',
        value: groupName,
        displayName: groupName,
        getCalendar: () =>
          this.calendarService.generateCalenadrForGroup(groupName),
        notFoundMessage: 'Group not found by this name or id',
      },
      resource,
      req,
      res,
    );
  }

  @All(['teacher/:teacherId', 'teacher/:teacherId/:resource'])
  @Version('1')
  async handleTeacherRequest(
    @Param('teacherId') teacherId: number,
    @Param('resource') resource: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleRequest(
      {
        type: 'teacher',
        value: teacherId,
        displayName: `teacher:${teacherId}`,
        getCalendar: () =>
          this.calendarService.generateCalenadrForTeacher(teacherId),
        notFoundMessage: 'Teacher not found',
      },
      resource,
      req,
      res,
    );
  }

  /**
   * Обрабатывает общие для всех календарей методы CalDAV.
   */
  private async handleRequest(
    target: {
      type: 'group' | 'teacher';
      value: string | number;
      displayName: string;
      getCalendar: () => ReturnType<
        CalendarService['generateCalenadrForGroup']
      >;
      notFoundMessage: string;
    },
    resource: string | undefined,
    req: Request,
    res: Response,
  ): Promise<void> {
    const method = req.method.toUpperCase();
    const stopTimer = this.metricsService.startCalendarRequestTimer({
      protocol: 'caldav',
      targetType: target.type,
      target: target.value,
      method,
    });
    try {
      if (method === 'OPTIONS') {
        res
          .status(HttpStatus.NO_CONTENT)
          .set(this.calDavService.getOptionsHeaders())
          .end();
        stopTimer('success');
        return;
      }

      if (resource && resource !== 'calendar.ics') {
        stopTimer('not_found');
        throw new NotFoundException('Calendar resource not found');
      }

      const generatedCalendar = await target.getCalendar();
      if (!generatedCalendar) {
        stopTimer('not_found');
        throw new NotFoundException(target.notFoundMessage);
      }
      const calendar = this.calDavService.createCalendarResource(
        generatedCalendar.toString(),
      );
      const collectionHref = this.getCollectionHref(req);

      if (method === 'GET' || method === 'HEAD') {
        this.sendCalendar(res, calendar, method === 'HEAD');
        stopTimer('success');
        return;
      }
      if (method === 'PROPFIND') {
        res
          .status(207)
          .type('application/xml; charset=utf-8')
          .set('DAV', '1, calendar-access')
          .send(
            this.calDavService.createPropfindResponse(
              collectionHref,
              target.displayName,
              calendar,
              req.header('Depth'),
            ),
          );
        stopTimer('success');
        return;
      }
      if (method === 'REPORT') {
        res
          .status(207)
          .type('application/xml; charset=utf-8')
          .set('DAV', '1, calendar-access')
          .send(
            this.calDavService.createReportResponse(collectionHref, calendar),
          );
        stopTimer('success');
        return;
      }

      res
        .status(HttpStatus.METHOD_NOT_ALLOWED)
        .set('Allow', this.calDavService.getOptionsHeaders().Allow)
        .end();
      stopTimer('method_not_allowed');
    } catch (error) {
      stopTimer('error');
      throw error;
    }
  }

  private sendCalendar(
    res: Response,
    calendar: { content: string; etag: string },
    isHeadRequest: boolean,
  ): void {
    res
      .status(HttpStatus.OK)
      .set({
        'Content-Type': 'text/calendar; charset=utf-8',
        ETag: calendar.etag,
      })
      .send(isHeadRequest ? undefined : calendar.content);
  }

  private getCollectionHref(req: Request): string {
    const path = req.originalUrl.split('?')[0].replace(/\/calendar\.ics$/, '');
    return path.endsWith('/') ? path : `${path}/`;
  }
}
