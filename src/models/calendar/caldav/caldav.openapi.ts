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
  security: [],
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
      targetName: 'Group',
      isNumeric: false,
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
      targetName: 'Teacher',
      isNumeric: true,
      parameter: {
        name: 'teacherId',
        description: 'Числовой идентификатор преподавателя',
        example: 42,
        schema: { type: 'integer' },
      },
    },
    {
      path: '/v1/calendar/caldav/group-id/{groupId}',
      resourcePath: '/v1/calendar/caldav/group-id/{groupId}/{resource}',
      target: 'группы по постоянному ID',
      targetName: 'GroupId',
      isNumeric: true,
      parameter: {
        name: 'groupId',
        description:
          'Постоянный числовой идентификатор учебной группы. Предпочтителен для подписки на календарь.',
        example: 4627,
        schema: { type: 'integer', minimum: 1 },
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
        ...(targetPath.isNumeric
          ? errorResponse(
              HttpStatus.BAD_REQUEST,
              `Некорректный числовой идентификатор ${targetPath.target}`,
            )
          : {}),
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
      ...(targetPath.isNumeric
        ? errorResponse(
            HttpStatus.BAD_REQUEST,
            `Некорректный числовой идентификатор ${targetPath.target}`,
          )
        : {}),
      ...errorResponse(HttpStatus.UNAUTHORIZED, 'Требуется Basic Auth'),
      ...errorResponse(HttpStatus.NOT_FOUND, 'Календарь не найден'),
    };
    document.paths[targetPath.path] = {
      get: {
        ...baseOperation,
        operationId: `calendar_caldavGet${targetPath.targetName}`,
        summary: `Скачать CalDAV-календарь ${targetPath.target}`,
      },
      head: {
        ...baseOperation,
        operationId: `calendar_caldavHead${targetPath.targetName}`,
        summary: `Проверить CalDAV-календарь ${targetPath.target}`,
        responses: headResponses,
      },
      options: createOptionsOperation(
        parameters,
        `calendar_caldavOptions${targetPath.targetName}`,
      ),
      'x-webdav-methods': webDavMethods,
    } as any;

    document.paths[targetPath.resourcePath] = {
      get: {
        ...baseOperation,
        operationId: `calendar_caldavGet${targetPath.targetName}Resource`,
        summary: `Скачать calendar.ics ${targetPath.target}`,
        parameters: resourceParameters,
      },
      head: {
        ...baseOperation,
        operationId: `calendar_caldavHead${targetPath.targetName}Resource`,
        summary: `Проверить calendar.ics ${targetPath.target}`,
        parameters: resourceParameters,
        responses: headResponses,
      },
      options: createOptionsOperation(
        resourceParameters,
        `calendar_caldavOptions${targetPath.targetName}Resource`,
      ),
      'x-webdav-methods': webDavMethods,
    } as any;
  }
}
