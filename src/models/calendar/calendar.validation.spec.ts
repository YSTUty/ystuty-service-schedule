import { INestApplication, Module, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import * as request from 'supertest';

import { getCorsOptions } from '../../common/config/cors.config';
import { MetricsService } from '../metrics/metrics.service';

import { CalDavBasicAuthGuard } from './caldav/caldav-basic-auth.guard';
import { CalDavSyncService } from './caldav/caldav-sync.service';
import { CalDavController } from './caldav/caldav.controller';
import { CalDavService } from './caldav/caldav.service';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

const calendarService = {
  generateCalendarForGroup: jest.fn(),
  generateCalendarForGroupId: jest.fn(),
  generateCalendarForTeacher: jest.fn(),
};
const metricsService = {
  startCalendarRequestTimer: jest.fn(() => jest.fn()),
};

@Module({
  controllers: [CalendarController, CalDavController],
  providers: [
    CalDavBasicAuthGuard,
    CalDavService,
    {
      provide: CalDavSyncService,
      useValue: {
        getChanges: jest.fn(),
        getCurrentSnapshot: jest.fn(),
      },
    },
    { provide: CalendarService, useValue: calendarService },
    { provide: MetricsService, useValue: metricsService },
  ],
})
class CalendarValidationTestModule {}

describe('Calendar teacherId validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [CalendarValidationTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.enableCors((req, callback) => callback(null, getCorsOptions(req)));
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a non-numeric iCalendar teacherId before generating a calendar', async () => {
    await request(app.getHttpServer())
      .get('/v1/calendar/teacher/not-a-number.ical')
      .expect(400);

    expect(calendarService.generateCalendarForTeacher).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric persistent group ID before generating a calendar', async () => {
    await request(app.getHttpServer())
      .get('/v1/calendar/group-id/not-a-number.ical')
      .expect(400);

    expect(calendarService.generateCalendarForGroupId).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric persistent CalDAV group ID before generating a calendar', async () => {
    await request(app.getHttpServer())
      .get('/v1/calendar/caldav/group-id/not-a-number')
      .auth('calendar-client', '')
      .expect(400);

    expect(calendarService.generateCalendarForGroupId).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric CalDAV teacherId before generating a calendar', async () => {
    await request(app.getHttpServer())
      .get('/v1/calendar/caldav/teacher/not-a-number')
      .auth('calendar-client', '')
      .expect(400);

    expect(calendarService.generateCalendarForTeacher).not.toHaveBeenCalled();
  });

  it('challenges unauthenticated CalDAV OPTIONS with Basic Auth', async () => {
    await request(app.getHttpServer())
      .options(`/v1/calendar/caldav/group/${encodeURIComponent('ЦИС-27')}`)
      .expect(401)
      .expect(
        'www-authenticate',
        'Basic realm="YSTUty Calendar", charset="UTF-8"',
      );
  });
});
