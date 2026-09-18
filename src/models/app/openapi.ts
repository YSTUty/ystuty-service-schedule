import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { readFileSync } from 'fs';
import { join } from 'path';

import * as xEnv from '@my-environment';

import { ApiErrorResponseDto } from '@my-common';

import { addCalDavOpenApi } from '../calendar/caldav/caldav.openapi';

const operationIds: Record<string, Record<string, string>> = {
  AppController: {
    getTime: 'system_getUptime',
    getMyGroup: 'system_getMyGroup',
  },
  ScheduleController: {
    getCount: 'schedule_getCount',
    getActualGroups: 'schedule_getActualGroups',
    getByGroup: 'schedule_getGroupSchedule',
    getByGroupAsWeek: 'schedule_getGroupWeekSchedule',
    getTeachers: 'schedule_getActualTeachers',
    getByTeacher: 'schedule_getTeacherSchedule',
    getAudiences: 'schedule_getActualAudiences',
    getByAudience: 'schedule_getAudienceSchedule',
    getAllAudiences: 'schedule_getAllAudiences',
    getScheduleSemesters: 'schedule_getAllSemesters',
  },
  CalendarController: {
    forGroup: 'calendar_exportGroupIcal',
    getCalendarForTeacherICAL: 'calendar_exportTeacherIcal',
  },
};
const packageVersion: string = JSON.parse(
  readFileSync(join(__dirname, '../../../package.json'), 'utf8'),
).version;

/**
 * Создаёт единую OpenAPI-схему, используемую Swagger UI, Scalar и JSON-выдачей.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const oauthTokenUrl = `${xEnv.OAUTH_URL.replace(/\/$/, '')}/access_token`;
  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${xEnv.APP_NAME} API`)
    .setDescription(
      [
        'Публичный API расписания ЯГТУ для веб-клиентов, ботов и интеграций.',
        'Все маршруты с расписанием и календарями используют URI-версию `/v1`.',
        'CalDAV дополняется extension `x-webdav-methods`, потому что OpenAPI не описывает PROPFIND и REPORT.',
      ].join('\n\n'),
    )
    .setVersion(process.env.npm_package_version || packageVersion)
    .addTag('system', 'Системные и OAuth-зависимые методы')
    .addTag('schedule', 'Расписание, справочники и семестры')
    .addTag('calendar', 'Публичный экспорт iCalendar')
    .addTag('caldav', 'Read-only CalDAV-календари')
    .addServer(xEnv.SERVER_URL, 'Schedule API')
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          clientCredentials: {
            scopes: {
              'schedule:user': 'Read the group from an OAuth user profile',
              'schedule:read': 'Read protected schedule reference data',
              'schedule:advanced:read':
                'Read the protected weekly schedule representation',
              'schedule:nolimit': 'Bypass service rate limits',
            },
            tokenUrl: oauthTokenUrl,
          },
        },
      },
      'oauth2',
    )
    .addApiKey({ type: 'apiKey', in: 'query' }, 'access_token')
    .addBearerAuth({ type: 'http', bearerFormat: 'Bearer' }, 'bearer')
    .addBasicAuth(
      {
        type: 'http',
        scheme: 'basic',
        description:
          'Для CalDAV достаточно непустого логина; пароль не проверяется.',
      },
      'caldavBasic',
    );

  if (xEnv.NODE_ENV === xEnv.EnvType.DEV) {
    swaggerConfig.addServer(`http://{host}:{port}`, 'Локальная разработка', {
      host: {
        default: 'localhost',
        enum: ['localhost', '127.0.0.1', '[::1]'],
      },
      port: {
        default: String(xEnv.EXTERNAL_PORT),
        enum: [...new Set([xEnv.EXTERNAL_PORT, xEnv.SERVER_PORT].map(String))],
      },
    });
  }

  const document = SwaggerModule.createDocument(app, swaggerConfig.build(), {
    deepScanRoutes: true,
    extraModels: [ApiErrorResponseDto],
    operationIdFactory: (controller, method) =>
      operationIds[controller]?.[method] ||
      `${controller.replace(/Controller$/, '')}_${method}`,
  });
  addCalDavOpenApi(document);

  return document;
}
