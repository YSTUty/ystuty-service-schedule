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
  ) {
    this.logger.log(
      `Generate calendar [${groupName}]; ${JSON.stringify(req.headers['user-agent'])}`,
    );

    const calendar =
      await this.calendarService.generateCalenadrForGroup(groupName);
    if (!calendar) {
      throw new NotFoundException('group not found by this name or id ');
    }

    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(`${groupName}.ics`)}"`,
    });
    res.end(calendar.toString());
  }
}
