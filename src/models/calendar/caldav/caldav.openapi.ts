import { HttpStatus } from '@nestjs/common';
import { getSchemaPath, OpenAPIObject } from '@nestjs/swagger';

import { ApiErrorResponseDto } from '@my-common';

const calendarContent = {
  'text/calendar': {
    schema: {
      type: 'string',
      format: 'binary',
    },
  },
};

const errorResponse = (status: HttpStatus, description: string) => ({
  [status]: {
    description,
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
      },
    },
  },
});

const getSecurity = [{ caldavBasic: [] }];

const createOptionsOperation = (
  parameters: Record<string, unknown>[],
  operationId: string,
) => ({
  operationId,
  tags: ['caldav'],
  summary: 'Получить поддерживаемые CalDAV-методы',
  security: getSecurity,
  parameters,
  responses: {
    [HttpStatus.NO_CONTENT]: {
      description: 'CalDAV-коллекция доступна',
      headers: {
        Allow: {
          schema: {
            type: 'string',
            example: 'OPTIONS, PROPFIND, REPORT, GET, HEAD',
          },
        },
        DAV: {
          schema: {
            type: 'string',
            example: '1, calendar-access',
          },
        },
      },
    },
    ...errorResponse(HttpStatus.UNAUTHORIZED, 'Требуется Basic Auth'),
  },
});

/**
 * OpenAPI не поддерживает методы PROPFIND и REPORT. Поэтому обычные методы
 * CalDAV описываются стандартными operation, а нестандартные — extension.
 */
export function addCalDavOpenApi(document: OpenAPIObject): void {
  const targetPaths = [
    {
      path: '/v1/calendar/caldav/group/{groupName}',
      resourcePath: '/v1/calendar/caldav/group/{groupName}/{resource}',
      target: 'группы',
      parameter: {
        name: 'groupName',
        description: 'Название группы',
        example: 'ЦИС-37',
        schema: { type: 'string' },
      },
    },
    {
      path: '/v1/calendar/caldav/teacher/{teacherId}',
      resourcePath: '/v1/calendar/caldav/teacher/{teacherId}/{resource}',
      target: 'преподавателя',
      parameter: {
        name: 'teacherId',
        description: 'Числовой идентификатор преподавателя',
        example: 42,
        schema: { type: 'number' },
      },
    },
  ];

  for (const targetPath of targetPaths) {
    const parameters = [
      {
        name: targetPath.parameter.name,
        in: 'path',
        required: true,
        description: targetPath.parameter.description,
        example: targetPath.parameter.example,
        schema: targetPath.parameter.schema,
      },
    ];
    const baseOperation = {
      tags: ['caldav'],
      security: getSecurity,
      parameters,
      responses: {
        [HttpStatus.OK]: {
          description: `iCalendar-файл с расписанием ${targetPath.target}`,
          content: calendarContent,
        },
        ...errorResponse(HttpStatus.UNAUTHORIZED, 'Требуется Basic Auth'),
        ...errorResponse(HttpStatus.NOT_FOUND, 'Календарь не найден'),
      },
    };
    const webDavMethods = {
      PROPFIND: {
        description: 'Возвращает свойства CalDAV-коллекции и calendar.ics.',
        successStatus: HttpStatus.MULTI_STATUS,
        responseContentType: 'application/xml; charset=utf-8',
      },
      REPORT: {
        description:
          'Возвращает calendar-query/report с содержимым calendar.ics.',
        successStatus: HttpStatus.MULTI_STATUS,
        responseContentType: 'application/xml; charset=utf-8',
      },
    };
    const resourceParameters = [
      ...parameters,
      {
        name: 'resource',
        in: 'path',
        required: true,
        description: 'Единственный доступный ресурс коллекции',
        schema: {
          type: 'string',
          enum: ['calendar.ics'],
        },
      },
    ];
    const headResponses = {
      [HttpStatus.OK]: {
        description: 'Календарь доступен',
      },
      ...errorResponse(HttpStatus.UNAUTHORIZED, 'Требуется Basic Auth'),
      ...errorResponse(HttpStatus.NOT_FOUND, 'Календарь не найден'),
    };
    const targetName =
      targetPath.parameter.name === 'groupName' ? 'Group' : 'Teacher';

    document.paths[targetPath.path] = {
      get: {
        ...baseOperation,
        operationId: `calendar_caldavGet${targetName}`,
        summary: `Скачать CalDAV-календарь ${targetPath.target}`,
      },
      head: {
        ...baseOperation,
        operationId: `calendar_caldavHead${targetName}`,
        summary: `Проверить CalDAV-календарь ${targetPath.target}`,
        responses: headResponses,
      },
      options: createOptionsOperation(
        parameters,
        `calendar_caldavOptions${targetName}`,
      ),
      'x-webdav-methods': webDavMethods,
    } as any;

    document.paths[targetPath.resourcePath] = {
      get: {
        ...baseOperation,
        operationId: `calendar_caldavGet${targetName}Resource`,
        summary: `Скачать calendar.ics ${targetPath.target}`,
        parameters: resourceParameters,
      },
      head: {
        ...baseOperation,
        operationId: `calendar_caldavHead${targetName}Resource`,
        summary: `Проверить calendar.ics ${targetPath.target}`,
        parameters: resourceParameters,
        responses: headResponses,
      },
      options: createOptionsOperation(
        resourceParameters,
        `calendar_caldavOptions${targetName}Resource`,
      ),
      'x-webdav-methods': webDavMethods,
    } as any;
  }
}
