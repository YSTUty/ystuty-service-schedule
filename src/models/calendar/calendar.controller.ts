import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Req,
  Res,
  Version,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RealIP } from 'nestjs-real-ip';

import { Request, Response } from 'express';

import { ApiErrorResponses } from '@my-common';

import { MetricsService } from '../metrics/metrics.service';

import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@Controller('/calendar')
@ApiErrorResponses(
  HttpStatus.NOT_FOUND,
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.INTERNAL_SERVER_ERROR,
)
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('group/:groupName.ical')
  @Version('1')
  @ApiOperation({
    summary: 'Получить файл календаря ical с расписанием группы',
  })
  @ApiParam({
    name: 'groupName',
    required: true,
    examples: {
      a: {
        summary: 'Группа ЭИС-46',
        value: 'ЭИС-46',
      },
      b: {
        summary: 'Группа ЦИС-16',
        value: 'ЦИС-16',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'iCalendar-файл с расписанием группы',
    content: {
      ['text/calendar']: {},
    },
    headers: {
      ['Content-Disposition']: {
        schema: {
          type: 'string',
          example: 'attachment; filename="groupName.ical"',
        },
      },
    },
  })
  async forGroup(
    @Param('groupName') groupName: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @RealIP() ipAddress: string,
  ) {
    this.logger.log(
      `Generate calendar [${groupName}]; (ip: ${ipAddress}) ${JSON.stringify(req.headers['user-agent'])}`,
    );

    const stopTimer = this.metricsService.startCalendarRequestTimer({
      protocol: 'ical',
      targetType: 'group',
      target: groupName,
      method: 'GET',
    });
    try {
      const calendar =
        await this.calendarService.generateCalenadrForGroup(groupName);
      if (!calendar) {
        stopTimer('not_found');
        throw new NotFoundException('group not found by this name or id');
      }

      res.writeHead(200, {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`${groupName}.ics`)}"`,
      });
      res.end(calendar.toString());
      stopTimer('success');
    } catch (error) {
      stopTimer('error');
      throw error;
    }
  }

  @Get('teacher/:teacherId.ical')
  @Version('1')
  @ApiOperation({
    summary: 'Получить iCalendar-файл с расписанием преподавателя',
  })
  @ApiParam({
    name: 'teacherId',
    required: true,
    description: 'Числовой идентификатор преподавателя',
    type: Number,
    examples: {
      a: {
        summary: 'Преподаватель Иванов Иван Иванович',
        value: 1,
      },
      b: {
        summary: 'Преподаватель Петров Петр Петрович',
        value: 2,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'iCalendar-файл с расписанием преподавателя',
    content: {
      ['text/calendar']: {},
    },
    headers: {
      ['Content-Disposition']: {
        schema: {
          type: 'string',
          example: 'attachment; filename="teacher-id.ical"',
        },
      },
    },
  })
  async getCalendarForTeacherICAL(
    @Param('teacherId') teacherId: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @RealIP() ipAddress: string,
  ) {
    this.logger.log(
      `Generate calendar [teacher:${teacherId}]; (ip: ${ipAddress}) ${JSON.stringify(req.headers['user-agent'])}`,
    );

    const stopTimer = this.metricsService.startCalendarRequestTimer({
      protocol: 'ical',
      targetType: 'teacher',
      target: teacherId,
      method: 'GET',
    });
    try {
      const calendar =
        await this.calendarService.generateCalenadrForTeacher(teacherId);
      if (!calendar) {
        stopTimer('not_found');
        throw new NotFoundException('Teacher not found');
      }

      res.writeHead(200, {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`teacher-${teacherId}.ics`)}"`,
      });
      res.end(calendar.toString());
      stopTimer('success');
    } catch (error) {
      stopTimer('error');
      throw error;
    }
  }
}
