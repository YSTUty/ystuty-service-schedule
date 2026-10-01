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
  summary: string,
  description: string,
  allow: string,
  dav: string,
) => ({
  operationId,
  tags: ['caldav'],
  summary,
  security: getSecurity,
  parameters,
  responses: {
    [HttpStatus.NO_CONTENT]: {
      description,
      headers: {
        Allow: {
          schema: {
            type: 'string',
            example: allow,
          },
        },
        DAV: {
          schema: {
            type: 'string',
            example: dav,
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
      calendarPath: '/v1/calendar/caldav/group/{groupName}/calendar',
      resourcePath: '/v1/calendar/caldav/group/{groupName}/calendar/{resource}',
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
      calendarPath: '/v1/calendar/caldav/teacher/{teacherId}/calendar',
      resourcePath:
        '/v1/calendar/caldav/teacher/{teacherId}/calendar/{resource}',
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
      calendarPath: '/v1/calendar/caldav/group-id/{groupId}/calendar',
      resourcePath:
        '/v1/calendar/caldav/group-id/{groupId}/calendar/{resource}',
      target: 'группы по постоянному ID',
      targetName: 'GroupId',
      isNumeric: true,
      parameter: {
        name: 'groupId',
        description:
          'Постоянный ID учебной группы (`gruppa.idgroup`). Не путать с `groupId` из `actual_groups.additional=true` (`raspzv.idgr`). Предпочтителен для подписки на календарь.',
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
        description:
          'Возвращает свойства calendar collection и её event resources.',
        successStatus: HttpStatus.MULTI_STATUS,
        responseContentType: 'application/xml; charset=utf-8',
      },
      REPORT: {
        description:
          'Поддерживает calendar-query с фильтром времени, calendar-multiget и RFC 6578 sync-collection.',
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
        description:
          'Стабильный event resource, найденный через PROPFIND или REPORT',
        schema: {
          type: 'string',
          pattern: '^[a-f0-9]{64}\\.ics$',
          example:
            '4d967545c82b4ee9a07dff871a59ab9471ea7f2679d1a2f9ac51956279b23c6a.ics',
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
      options: createOptionsOperation(
        parameters,
        `calendar_caldavOptions${targetPath.targetName}Home`,
        'Получить поддерживаемые WebDAV-методы calendar home',
        'Calendar home доступен',
        'OPTIONS, PROPFIND',
        '1, calendar-access',
      ),
      'x-webdav-methods': {
        PROPFIND: {
          description:
            'Возвращает calendar home и единственную дочернюю calendar collection.',
          successStatus: HttpStatus.MULTI_STATUS,
          responseContentType: 'application/xml; charset=utf-8',
        },
      },
      'x-caldav-discovery':
        'Это calendar home. PROPFIND Depth: 1 возвращает одну read-only calendar collection по пути /calendar/. DAV:current-user-principal ведёт на virtual principal, а его CALDAV:calendar-home-set — обратно на этот calendar home.',
    } as any;

    document.paths[targetPath.calendarPath] = {
      options: createOptionsOperation(
        parameters,
        `calendar_caldavOptions${targetPath.targetName}Collection`,
        'Получить поддерживаемые CalDAV-методы calendar collection',
        'Read-only CalDAV-коллекция доступна',
        'OPTIONS, PROPFIND, REPORT',
        '1, calendar-access, sync-collection',
      ),
      'x-webdav-methods': webDavMethods,
    } as any;

    document.paths[targetPath.resourcePath] = {
      get: {
        ...baseOperation,
        operationId: `calendar_caldavGet${targetPath.targetName}Resource`,
        summary: `Скачать event resource CalDAV-календаря ${targetPath.target}`,
        parameters: resourceParameters,
      },
      head: {
        ...baseOperation,
        operationId: `calendar_caldavHead${targetPath.targetName}Resource`,
        summary: `Проверить event resource CalDAV-календаря ${targetPath.target}`,
        parameters: resourceParameters,
        responses: headResponses,
      },
      options: createOptionsOperation(
        resourceParameters,
        `calendar_caldavOptions${targetPath.targetName}Resource`,
        `Получить поддерживаемые WebDAV-методы event resource календаря ${targetPath.target}`,
        'Event resource доступен',
        'OPTIONS, PROPFIND, GET, HEAD',
        '1, calendar-access',
      ),
      'x-webdav-methods': webDavMethods,
    } as any;
  }
}
