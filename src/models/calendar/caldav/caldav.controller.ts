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

import { CalendarService } from '../calendar.service';

import { CalDavBasicAuthGuard } from './caldav-basic-auth.guard';
import { CalDavService } from './caldav.service';

/**
 * Read-only CalDAV-совместимый endpoint для календаря одной группы.
 */
@ApiExcludeController()
@Public()
@UseGuards(CalDavBasicAuthGuard)
@Controller('/calendar/caldav')
export class CalDavController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly calDavService: CalDavService,
  ) {}

  @All([':groupName', ':groupName/:resource'])
  @Version('1')
  async handleRequest(
    @Param('groupName') groupName: string,
    @Param('resource') resource: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const method = req.method.toUpperCase();
    if (method === 'OPTIONS') {
      res
        .status(HttpStatus.NO_CONTENT)
        .set(this.calDavService.getOptionsHeaders())
        .end();
      return;
    }

    if (resource && resource !== 'calendar.ics') {
      throw new NotFoundException('Calendar resource not found');
    }

    const generatedCalendar =
      await this.calendarService.generateCalenadrForGroup(groupName);
    if (!generatedCalendar) {
      throw new NotFoundException('Group not found by this name or id');
    }
    const calendar = this.calDavService.createCalendarResource(
      generatedCalendar.toString(),
    );
    const collectionHref = this.getCollectionHref(req);

    if (method === 'GET' || method === 'HEAD') {
      this.sendCalendar(res, calendar, method === 'HEAD');
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
            groupName,
            calendar,
            req.header('Depth'),
          ),
        );
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
      return;
    }

    res
      .status(HttpStatus.METHOD_NOT_ALLOWED)
      .set('Allow', this.calDavService.getOptionsHeaders().Allow)
      .end();
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
