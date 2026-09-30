import {
  All,
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Request, Response } from 'express';

import * as xEnv from '@my-environment';

import { Public } from '@my-common';

import { MetricsService } from '../../metrics/metrics.service';
import { CalendarService } from '../calendar.service';

import { CalDavBasicAuthGuard } from './caldav-basic-auth.guard';
import { CalDavSyncService } from './caldav-sync.service';
import { CalDavService } from './caldav.service';
import { CalDavCalendarCollection } from './caldav.types';

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
    private readonly calDavSyncService: CalDavSyncService,
    private readonly metricsService: MetricsService,
  ) {}

  @All(['group/:groupName', 'group/:groupName/:resource'])
  @Version('1')
  async handleGroupRequest(
    @Param('groupName') groupName: string,
    @Param('resource') resource: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: string | undefined,
  ): Promise<void> {
    await this.handleRequest(
      {
        type: 'group',
        value: groupName,
        syncKey: `group-name:${groupName}`,
        publicCollectionPath: `group/${encodeURIComponent(groupName)}`,
        getCollection: () =>
          this.calendarService.generateCalDavCalendarForGroup(groupName),
        notFoundMessage: 'Group not found by this name or id',
      },
      resource,
      req,
      res,
      body,
    );
  }

  @All(['group-id/:groupId', 'group-id/:groupId/:resource'])
  @Version('1')
  async handleGroupIdRequest(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('resource') resource: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: string | undefined,
  ): Promise<void> {
    await this.handleRequest(
      {
        type: 'group',
        value: groupId,
        syncKey: `group-id:${groupId}`,
        publicCollectionPath: `group-id/${groupId}`,
        getCollection: () =>
          this.calendarService.generateCalDavCalendarForGroupId(groupId),
        notFoundMessage: 'Group not found by this id',
      },
      resource,
      req,
      res,
      body,
    );
  }

  @All(['teacher/:teacherId', 'teacher/:teacherId/:resource'])
  @Version('1')
  async handleTeacherRequest(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Param('resource') resource: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: string | undefined,
  ): Promise<void> {
    await this.handleRequest(
      {
        type: 'teacher',
        value: teacherId,
        syncKey: `teacher:${teacherId}`,
        publicCollectionPath: `teacher/${teacherId}`,
        getCollection: () =>
          this.calendarService.generateCalDavCalendarForTeacher(teacherId),
        notFoundMessage: 'Teacher not found',
      },
      resource,
      req,
      res,
      body,
    );
  }

  /**
   * Обрабатывает общие для всех календарей методы CalDAV.
   */
  private async handleRequest(
    target: {
      type: 'group' | 'teacher';
      value: string | number;
      syncKey: string;
      publicCollectionPath: string;
      getCollection: () => Promise<CalDavCalendarCollection | null>;
      notFoundMessage: string;
    },
    resource: string | undefined,
    req: Request,
    res: Response,
    body: string | undefined,
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

      const collection = await target.getCollection();
      if (!collection) {
        stopTimer('not_found');
        throw new NotFoundException(target.notFoundMessage);
      }
      const collectionHref = this.getCollectionHref(target);
      const calendarResource = resource
        ? collection.resources.find((candidate) => candidate.name === resource)
        : undefined;

      if (resource && !calendarResource) {
        stopTimer('not_found');
        throw new NotFoundException('Calendar resource not found');
      }

      if ((method === 'GET' || method === 'HEAD') && calendarResource) {
        this.sendCalendar(res, calendarResource, method === 'HEAD');
        stopTimer('success');
        return;
      }
      if (method === 'PROPFIND') {
        const propfindResponse = calendarResource
          ? this.calDavService.createCalendarResourcePropfindResponse(
              `${collectionHref}${calendarResource.name}`,
              calendarResource,
            )
          : this.calDavService.createCollectionPropfindResponse(
              collectionHref,
              collection,
              req.header('Depth'),
              (
                await this.calDavSyncService.getCurrentSnapshot(
                  this.getSyncCollectionKey(target),
                  collection,
                )
              ).token,
            );
        res
          .status(207)
          .type('application/xml; charset=utf-8')
          .set('DAV', '1, calendar-access')
          .send(propfindResponse);
        stopTimer('success');
        return;
      }
      if (method === 'REPORT') {
        const report = this.calDavService.parseReportRequest(body);
        if (!report) {
          throw new BadRequestException('Unsupported or invalid CalDAV REPORT');
        }
        if (report.type === 'sync-collection') {
          // RFC 6578 sync-collection обрабатывает только саму collection.
          if ((req.header('Depth') ?? '0') !== '0') {
            throw new BadRequestException(
              'CalDAV sync-collection requires Depth: 0',
            );
          }
          const syncResult = await this.calDavSyncService.getChanges(
            this.getSyncCollectionKey(target),
            collection,
            report.syncToken,
          );
          if (!syncResult.isValid) {
            res
              .status(HttpStatus.FORBIDDEN)
              .type('application/xml; charset=utf-8')
              .set('DAV', '1, calendar-access, sync-collection')
              .send(this.calDavService.createInvalidSyncTokenResponse());
            stopTimer('invalid_sync_token');
            return;
          }
          res
            .status(HttpStatus.MULTI_STATUS)
            .type('application/xml; charset=utf-8')
            .set('DAV', '1, calendar-access, sync-collection')
            .send(
              this.calDavService.createSyncCollectionResponse(
                collectionHref,
                syncResult,
                report.includeCalendarData,
              ),
            );
          stopTimer('success');
          return;
        }
        const reportResult = this.calDavService.getReportResources(
          collection,
          report,
          req.header('Depth'),
        );
        res
          .status(207)
          .type('application/xml; charset=utf-8')
          .set('DAV', '1, calendar-access')
          .send(
            this.calDavService.createReportResponse(
              collectionHref,
              reportResult,
              report.includeCalendarData,
            ),
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

  /**
   * Path-relative href сохраняет origin, по которому клиент открыл collection.
   * Это исключает потерю Basic Auth при разных public-доменах reverse proxy.
   */
  private getCollectionHref(target: { publicCollectionPath: string }): string {
    const calendarPath = new URL(xEnv.CUSTOM_CALENDAR_URL).pathname.replace(
      /\/+$/,
      '',
    );

    return `${calendarPath}/caldav/${target.publicCollectionPath}/`;
  }

  private getSyncCollectionKey(target: { syncKey: string }): string {
    return target.syncKey;
  }
}
