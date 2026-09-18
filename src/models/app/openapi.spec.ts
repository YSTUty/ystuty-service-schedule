import { INestApplication, Module, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { CalDavBasicAuthGuard } from '../calendar/caldav/caldav-basic-auth.guard';
import { CalDavController } from '../calendar/caldav/caldav.controller';
import { CalDavService } from '../calendar/caldav/caldav.service';
import { CalendarController } from '../calendar/calendar.controller';
import { CalendarService } from '../calendar/calendar.service';
import { MetricsService } from '../metrics/metrics.service';
import { ScheduleController } from '../schedule/schedule.controller';
import { ScheduleService } from '../schedule/schedule.service';

import { AppController } from './app.controller';
import { createOpenApiDocument } from './openapi';

@Module({
  controllers: [
    AppController,
    ScheduleController,
    CalendarController,
    CalDavController,
  ],
  providers: [
    CalDavBasicAuthGuard,
    { provide: ScheduleService, useValue: {} },
    { provide: CalendarService, useValue: {} },
    { provide: CalDavService, useValue: {} },
    { provide: MetricsService, useValue: {} },
  ],
})
class OpenApiTestModule {}

describe('OpenAPI document', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(OpenApiTestModule, { logger: false });
    app.enableVersioning({ type: VersioningType.URI });
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents public response schemas, OAuth scopes and CalDAV extension', () => {
    const document = createOpenApiDocument(app);
    const schemas = document.components.schemas as Record<string, any>;
    const securitySchemes = document.components.securitySchemes as Record<
      string,
      any
    >;

    expect(document.paths['/v1/schedule/group/{groupIdOrName}'].get).toEqual(
      expect.objectContaining({
        operationId: 'schedule_getGroupSchedule',
      }),
    );
    expect(schemas.OneWeekDto.properties).toEqual(
      expect.objectContaining({
        number: expect.any(Object),
        days: expect.any(Object),
      }),
    );
    expect(schemas.ScheduleItemsResponseDto.properties).toEqual(
      expect.objectContaining({
        cache: expect.any(Object),
        items: expect.any(Object),
      }),
    );
    expect(document.paths['/getMyGroup'].get.security).toStrictEqual([
      { oauth2: ['schedule:user'] },
      { bearer: ['schedule:user'] },
      { access_token: ['schedule:user'] },
    ]);
    expect(
      securitySchemes.oauth2.flows.clientCredentials.scopes,
    ).toHaveProperty('schedule:user');
    expect(document.paths['/v1/calendar/caldav/group/{groupName}']).toEqual(
      expect.objectContaining({
        get: expect.any(Object),
        head: expect.any(Object),
        options: expect.any(Object),
        'x-webdav-methods': expect.objectContaining({
          PROPFIND: expect.any(Object),
          REPORT: expect.any(Object),
        }),
      }),
    );
  });
});
