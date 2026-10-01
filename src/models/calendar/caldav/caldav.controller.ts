import {
  All,
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
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
import {
  CalDavCalendarCollection,
  CalDavCalendarResource,
} from './caldav.types';

interface CalDavTarget {
  type: 'group' | 'teacher';
  value: string | number;
  syncKey: string;
  publicCollectionPath: string;
  getCollection: () => Promise<CalDavCalendarCollection | null>;
  notFoundMessage: string;
}

interface CalDavRequestLogDetails {
  depth?: string;
  requestedProperties?: string;
  reportType?: 'calendar-query' | 'calendar-multiget' | 'sync-collection';
  eventResources?: number;
  totalEventResources?: number;
  missingResources?: number;
  deletedResources?: number;
  includeCalendarData?: boolean;
  calendarCollections?: number;
}

/**
 * Read-only CalDAV-совместимый endpoint для календарей групп и преподавателей.
 */
@ApiExcludeController()
@Public()
@UseGuards(CalDavBasicAuthGuard)
@Controller('/calendar/caldav')
export class CalDavController {
  private readonly logger = new Logger(CalDavController.name);

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
    @Body() body?: string,
  ): Promise<void> {
    await this.handleRequest(
      this.createGroupTarget(groupName),
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
    @Body() body?: string,
  ): Promise<void> {
    await this.handleRequest(
      this.createGroupIdTarget(groupId),
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
    @Body() body?: string,
  ): Promise<void> {
    await this.handleRequest(
      this.createTeacherTarget(teacherId),
      resource,
      req,
      res,
      body,
    );
  }

  @All('principals/group/:groupName')
  @Version('1')
  async handleGroupPrincipalRequest(
    @Param('groupName') groupName: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: string,
  ): Promise<void> {
    await this.handlePrincipalRequest(
      this.createGroupTarget(groupName),
      req,
      res,
      body,
    );
  }

  @All('principals/group-id/:groupId')
  @Version('1')
  async handleGroupIdPrincipalRequest(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: string,
  ): Promise<void> {
    await this.handlePrincipalRequest(
      this.createGroupIdTarget(groupId),
      req,
      res,
      body,
    );
  }

  @All('principals/teacher/:teacherId')
  @Version('1')
  async handleTeacherPrincipalRequest(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: string,
  ): Promise<void> {
    await this.handlePrincipalRequest(
      this.createTeacherTarget(teacherId),
      req,
      res,
      body,
    );
  }

  @All('homes/group/:groupName')
  @Version('1')
  async handleGroupCalendarHomeRequest(
    @Param('groupName') groupName: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: string,
  ): Promise<void> {
    await this.handleCalendarHomeRequest(
      this.createGroupTarget(groupName),
      req,
      res,
      body,
    );
  }

  @All('homes/group-id/:groupId')
  @Version('1')
  async handleGroupIdCalendarHomeRequest(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: string,
  ): Promise<void> {
    await this.handleCalendarHomeRequest(
      this.createGroupIdTarget(groupId),
      req,
      res,
      body,
    );
  }

  @All('homes/teacher/:teacherId')
  @Version('1')
  async handleTeacherCalendarHomeRequest(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: string,
  ): Promise<void> {
    await this.handleCalendarHomeRequest(
      this.createTeacherTarget(teacherId),
      req,
      res,
      body,
    );
  }

  /**
   * Обрабатывает общие для всех календарей методы CalDAV.
   */
  private async handleRequest(
    target: CalDavTarget,
    resource: string | undefined,
    req: Request,
    res: Response,
    body?: string,
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
        this.logRequest(
          req,
          target,
          'collection',
          method,
          HttpStatus.NO_CONTENT,
        );
        return;
      }

      const collection = await target.getCollection();
      if (!collection) {
        stopTimer('not_found');
        throw new NotFoundException(target.notFoundMessage);
      }
      const collectionHref = this.getCollectionHref(req, target);
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
        this.logRequest(
          req,
          target,
          'resource',
          method,
          HttpStatus.OK,
          calendarResource.name,
        );
        return;
      }
      if (method === 'PROPFIND') {
        const depth = this.getRequestDepth(req);
        const propfind = this.calDavService.parsePropfindRequest(body);
        if (!propfind) {
          throw new BadRequestException('Invalid CalDAV PROPFIND');
        }
        const propfindResponse = calendarResource
          ? this.calDavService.createCalendarResourcePropfindResponse(
              `${collectionHref}${calendarResource.name}`,
              calendarResource,
              propfind,
            )
          : this.calDavService.createCollectionPropfindResponse(
              collectionHref,
              collection,
              depth,
              (
                await this.calDavSyncService.getCurrentSnapshot(
                  this.getSyncCollectionKey(target),
                  collection,
                )
              ).token,
              this.getPrincipalHref(req, target),
              propfind,
            );
        res
          .status(207)
          .type('application/xml; charset=utf-8')
          .set('DAV', '1, calendar-access')
          .send(propfindResponse);
        stopTimer('success');
        this.logRequest(
          req,
          target,
          calendarResource ? 'resource' : 'collection',
          method,
          HttpStatus.MULTI_STATUS,
          calendarResource?.name,
          {
            depth,
            eventResources: calendarResource
              ? 1
              : this.getPropfindEventResourcesCount(collection, depth),
            totalEventResources: calendarResource
              ? undefined
              : collection.resources.length,
            requestedProperties:
              this.calDavService.getPropfindPropertiesForLog(propfind),
          },
        );
        return;
      }
      if (method === 'REPORT') {
        const report = this.calDavService.parseReportRequest(body);
        if (!report) {
          throw new BadRequestException('Unsupported or invalid CalDAV REPORT');
        }
        if (report.type === 'sync-collection') {
          // RFC 6578 sync-collection обрабатывает только саму collection.
          if (this.getRequestDepth(req) !== '0') {
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
            this.logRequest(
              req,
              target,
              'collection',
              method,
              HttpStatus.FORBIDDEN,
              undefined,
              {
                depth: this.getRequestDepth(req),
                reportType: report.type,
                eventResources: 0,
                deletedResources: 0,
                includeCalendarData: report.includeCalendarData,
              },
            );
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
          this.logRequest(
            req,
            target,
            'collection',
            method,
            HttpStatus.MULTI_STATUS,
            undefined,
            {
              depth: this.getRequestDepth(req),
              reportType: report.type,
              eventResources: syncResult.resources.length,
              deletedResources: syncResult.deletedResourceNames.length,
              includeCalendarData: report.includeCalendarData,
            },
          );
          return;
        }
        const reportResult = this.calDavService.getReportResources(
          collection,
          report,
          this.getRequestDepth(req),
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
        this.logRequest(
          req,
          target,
          'collection',
          method,
          HttpStatus.MULTI_STATUS,
          undefined,
          {
            depth: this.getRequestDepth(req),
            reportType: report.type,
            eventResources: reportResult.resources.length,
            missingResources: reportResult.missingHrefs.length,
            includeCalendarData: report.includeCalendarData,
          },
        );
        return;
      }

      res
        .status(HttpStatus.METHOD_NOT_ALLOWED)
        .set('Allow', this.calDavService.getOptionsHeaders().Allow)
        .end();
      stopTimer('method_not_allowed');
      this.logRequest(
        req,
        target,
        resource ? 'resource' : 'collection',
        method,
        HttpStatus.METHOD_NOT_ALLOWED,
        resource,
      );
    } catch (error) {
      stopTimer('error');
      this.logRequest(
        req,
        target,
        resource ? 'resource' : 'collection',
        method,
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
        resource,
      );
      throw error;
    }
  }

  /** Обрабатывает CalDAV principal, связанный с конкретной collection. */
  private async handlePrincipalRequest(
    target: CalDavTarget,
    req: Request,
    res: Response,
    body?: string,
  ): Promise<void> {
    const method = req.method.toUpperCase();
    try {
      if (method === 'OPTIONS') {
        res
          .status(HttpStatus.NO_CONTENT)
          .set(this.calDavService.getOptionsHeaders())
          .end();
        this.logRequest(
          req,
          target,
          'principal',
          method,
          HttpStatus.NO_CONTENT,
        );
        return;
      }
      if (method !== 'PROPFIND') {
        res
          .status(HttpStatus.METHOD_NOT_ALLOWED)
          .set('Allow', 'OPTIONS, PROPFIND')
          .end();
        this.logRequest(
          req,
          target,
          'principal',
          method,
          HttpStatus.METHOD_NOT_ALLOWED,
        );
        return;
      }

      const collection = await target.getCollection();
      if (!collection) {
        throw new NotFoundException(target.notFoundMessage);
      }
      const propfind = this.calDavService.parsePropfindRequest(body);
      if (!propfind) {
        throw new BadRequestException('Invalid CalDAV PROPFIND');
      }
      res
        .status(HttpStatus.MULTI_STATUS)
        .type('application/xml; charset=utf-8')
        .set('DAV', '1, calendar-access')
        .send(
          this.calDavService.createPrincipalPropfindResponse(
            this.getPrincipalHref(req, target),
            this.getCalendarHomeHref(req, target),
            propfind,
          ),
        );
      this.logRequest(
        req,
        target,
        'principal',
        method,
        HttpStatus.MULTI_STATUS,
        undefined,
        {
          depth: this.getRequestDepth(req),
          requestedProperties:
            this.calDavService.getPropfindPropertiesForLog(propfind),
        },
      );
    } catch (error) {
      this.logRequest(
        req,
        target,
        'principal',
        method,
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
      throw error;
    }
  }

  /** Обрабатывает calendar-home-set с единственной коллекцией расписания. */
  private async handleCalendarHomeRequest(
    target: CalDavTarget,
    req: Request,
    res: Response,
    body?: string,
  ): Promise<void> {
    const method = req.method.toUpperCase();
    try {
      if (method === 'OPTIONS') {
        res
          .status(HttpStatus.NO_CONTENT)
          .set(this.calDavService.getOptionsHeaders())
          .end();
        this.logRequest(
          req,
          target,
          'calendar-home',
          method,
          HttpStatus.NO_CONTENT,
        );
        return;
      }
      if (method !== 'PROPFIND') {
        res
          .status(HttpStatus.METHOD_NOT_ALLOWED)
          .set('Allow', 'OPTIONS, PROPFIND')
          .end();
        this.logRequest(
          req,
          target,
          'calendar-home',
          method,
          HttpStatus.METHOD_NOT_ALLOWED,
        );
        return;
      }

      const collection = await target.getCollection();
      if (!collection) {
        throw new NotFoundException(target.notFoundMessage);
      }
      const syncToken = (
        await this.calDavSyncService.getCurrentSnapshot(
          this.getSyncCollectionKey(target),
          collection,
        )
      ).token;
      const propfind = this.calDavService.parsePropfindRequest(body);
      if (!propfind) {
        throw new BadRequestException('Invalid CalDAV PROPFIND');
      }
      res
        .status(HttpStatus.MULTI_STATUS)
        .type('application/xml; charset=utf-8')
        .set('DAV', '1, calendar-access')
        .send(
          this.calDavService.createCalendarHomePropfindResponse(
            this.getCalendarHomeHref(req, target),
            this.getCollectionHref(req, target),
            collection,
            this.getRequestDepth(req),
            syncToken,
            this.getPrincipalHref(req, target),
            propfind,
          ),
        );
      this.logRequest(
        req,
        target,
        'calendar-home',
        method,
        HttpStatus.MULTI_STATUS,
        undefined,
        {
          depth: this.getRequestDepth(req),
          calendarCollections: this.hasDepthOneOrMore(req) ? 1 : 0,
          requestedProperties:
            this.calDavService.getPropfindPropertiesForLog(propfind),
        },
      );
    } catch (error) {
      this.logRequest(
        req,
        target,
        'calendar-home',
        method,
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
      throw error;
    }
  }

  private sendCalendar(
    res: Response,
    calendar: CalDavCalendarResource,
    isHeadRequest: boolean,
  ): void {
    res
      .status(HttpStatus.OK)
      .set({
        'Content-Type': 'text/calendar; charset=utf-8',
        ETag: calendar.etag,
        'Last-Modified': this.calDavService
          .getResourceLastModified(calendar)
          .toUTCString(),
      })
      .send(isHeadRequest ? undefined : calendar.content);
  }

  /**
   * Использует public origin текущего HTTPS-запроса, если Express доверяет
   * reverse proxy. Абсолютные href лучше совместимы со старыми DAV-клиентами.
   */
  private getCollectionHref(
    req: Request,
    target: { publicCollectionPath: string },
  ): string {
    return `${this.getCalDavBaseUrl(req)}/${target.publicCollectionPath}/`;
  }

  private getPrincipalHref(
    req: Request,
    target: { publicCollectionPath: string },
  ): string {
    return `${this.getCalDavBaseUrl(req)}/principals/${target.publicCollectionPath}/`;
  }

  private getCalendarHomeHref(
    req: Request,
    target: { publicCollectionPath: string },
  ): string {
    return `${this.getCalDavBaseUrl(req)}/homes/${target.publicCollectionPath}/`;
  }

  private getCalDavBaseUrl(req: Request): string {
    const configuredUrl = new URL(xEnv.CUSTOM_CALENDAR_URL);
    const calendarPath = configuredUrl.pathname.replace(/\/+$/, '');
    const requestHost = req.header('Host');
    const origin =
      req.secure && requestHost
        ? (this.getRequestOrigin(req.protocol, requestHost) ??
          configuredUrl.origin)
        : configuredUrl.origin;

    return `${origin}${calendarPath}/caldav`;
  }

  /** Возвращает origin только для валидных данных уже доверенного proxy. */
  private getRequestOrigin(protocol: string, host: string): string | null {
    try {
      const url = new URL(`${protocol}://${host}`);

      return url.origin;
    } catch {
      return null;
    }
  }

  private getSyncCollectionKey(target: { syncKey: string }): string {
    return target.syncKey;
  }

  /** Логирует CalDAV-обмен без Basic credentials и других чувствительных данных. */
  private logRequest(
    req: Request,
    target: CalDavTarget,
    endpoint: 'collection' | 'resource' | 'principal' | 'calendar-home',
    method: string,
    status: HttpStatus,
    resource?: string,
    details: CalDavRequestLogDetails = {},
  ): void {
    const suffix = resource ? `/${resource}` : '';
    const detailParts: string[] = [];
    if (details.depth) {
      detailParts.push(`depth=${details.depth}`);
    }
    if (details.requestedProperties) {
      detailParts.push(`properties=${details.requestedProperties}`);
    }
    if (details.reportType) {
      detailParts.push(`report=${details.reportType}`);
    }
    if (details.eventResources !== undefined) {
      const total =
        details.totalEventResources === undefined
          ? ''
          : `/${details.totalEventResources}`;
      detailParts.push(`event-resources=${details.eventResources}${total}`);
    }
    if (details.missingResources !== undefined) {
      detailParts.push(`missing=${details.missingResources}`);
    }
    if (details.deletedResources !== undefined) {
      detailParts.push(`deleted=${details.deletedResources}`);
    }
    if (details.includeCalendarData !== undefined) {
      detailParts.push(`calendar-data=${details.includeCalendarData}`);
    }
    if (details.calendarCollections !== undefined) {
      detailParts.push(`calendar-collections=${details.calendarCollections}`);
    }
    const userAgent = this.getSafeUserAgent(req.header('User-Agent'));
    if (userAgent) {
      detailParts.push(`user-agent=${JSON.stringify(userAgent)}`);
    }
    const detailsSuffix = detailParts.length
      ? ` (${detailParts.join('; ')})`
      : '';
    const message = `CalDAV ${method} [${endpoint}:${target.type}:${target.value}${suffix}] -> ${status}${detailsSuffix}`;

    if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }
  }

  /** RFC 4791: без заголовка Depth для collection подразумевается `0`. */
  private getRequestDepth(req: Request): string {
    return req.header('Depth') ?? '0';
  }

  private hasDepthOneOrMore(req: Request): boolean {
    const depth = this.getRequestDepth(req);

    return depth === '1' || depth === 'infinity';
  }

  private getPropfindEventResourcesCount(
    collection: CalDavCalendarCollection,
    depth: string,
  ): number {
    return depth === '1' || depth === 'infinity'
      ? collection.resources.length
      : 0;
  }

  /** Предотвращает подмену строк журналирования из заголовка User-Agent. */
  private getSafeUserAgent(userAgent: string | undefined): string | null {
    if (!userAgent) {
      return null;
    }

    return userAgent.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 160);
  }

  private createGroupTarget(groupName: string): CalDavTarget {
    return {
      type: 'group',
      value: groupName,
      syncKey: `group-name:${groupName}`,
      publicCollectionPath: `group/${encodeURIComponent(groupName)}`,
      getCollection: () =>
        this.calendarService.generateCalDavCalendarForGroup(groupName),
      notFoundMessage: 'Group not found by this name or id',
    };
  }

  private createGroupIdTarget(groupId: number): CalDavTarget {
    return {
      type: 'group',
      value: groupId,
      syncKey: `group-id:${groupId}`,
      publicCollectionPath: `group-id/${groupId}`,
      getCollection: () =>
        this.calendarService.generateCalDavCalendarForGroupId(groupId),
      notFoundMessage: 'Group not found by this id',
    };
  }

  private createTeacherTarget(teacherId: number): CalDavTarget {
    return {
      type: 'teacher',
      value: teacherId,
      syncKey: `teacher:${teacherId}`,
      publicCollectionPath: `teacher/${teacherId}`,
      getCollection: () =>
        this.calendarService.generateCalDavCalendarForTeacher(teacherId),
      notFoundMessage: 'Teacher not found',
    };
  }
}
