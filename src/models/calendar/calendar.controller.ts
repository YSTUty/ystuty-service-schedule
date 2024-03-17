import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Req,
  Res,
  Version,
} from '@nestjs/common';
import { RealIP } from 'nestjs-real-ip';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@Controller('/calendar')
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(private readonly calendarService: CalendarService) {}

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
    status: 200,
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

    const calendar =
      await this.calendarService.generateCalenadrForGroup(groupName);
    if (!calendar) {
      throw new NotFoundException('group not found by this name or id');
    }

    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(`${groupName}.ics`)}"`,
    });
    res.end(calendar.toString());
  }

  @Get('teacher/:teacherId.ical')
  @Version('1')
  @ApiOperation({ summary: 'Get an ical file for importing calendar events' })
  @ApiParam({
    name: 'teacherId',
    required: true,
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
    status: 200,
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

    const calendar =
      await this.calendarService.generateCalenadrForTeacher(teacherId);
    if (!calendar) {
      throw new NotFoundException('Teacher not found');
    }

    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(`teacher-${teacherId}.ics`)}"`,
    });
    res.end(calendar.toString());
  }
}
