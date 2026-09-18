import {
  Global,
  INestApplication,
  Module,
  VersioningType,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

import * as request from 'supertest';

import * as xEnv from '@my-environment';

import { ValidationHttpPipe } from '@my-common';

import { RedisService } from '../src/models/redis/redis.service';
import { ScheduleModule } from '../src/models/schedule/schedule.module';

/**
 * Real MSSQL tests are opt-in: their endpoints select live data but do not
 * write to MSSQL or the configured Redis instance.
 */
const runDatabaseContractTests =
  process.env.RUN_DATABASE_CONTRACT_TESTS === 'true';

class InMemoryRedisService {
  private readonly values = new Map<string, string>();

  public readonly redis = {
    get: async (key: string) => this.values.get(key) ?? null,
    set: async (key: string, value: string) => {
      this.values.set(key, value);
      return 'OK';
    },
    ttl: async (key: string) => (this.values.has(key) ? 300 : -2),
  };
}

const inMemoryRedisService = new InMemoryRedisService();

@Global()
@Module({
  providers: [
    {
      provide: RedisService,
      useValue: inMemoryRedisService,
    },
  ],
  exports: [RedisService],
})
class DatabaseContractRedisModule {}

@Module({
  imports: [
    DatabaseContractRedisModule,
    TypeOrmModule.forRoot({
      ...xEnv.TYPEORM_CONFIG,
      autoLoadEntities: true,
      logging: false,
    }),
    ScheduleModule,
  ],
})
class ScheduleDatabaseContractTestModule {}

interface IdName {
  id: number;
  name: string;
}

interface LegacyCacheResponse {
  isCache: boolean;
  cache: {
    isCached: boolean;
    ttlSeconds: number | null;
  };
}

const describeDatabaseContract = runDatabaseContractTests
  ? describe
  : describe.skip;

describeDatabaseContract('Schedule API database contract (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!xEnv.TYPEORM_CONFIG.host) {
      throw new Error(
        'TYPEORM_HOST must be configured for RUN_DATABASE_CONTRACT_TESTS=true',
      );
    }

    const moduleFixture = await Test.createTestingModule({
      imports: [ScheduleDatabaseContractTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationHttpPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  /**
   * Проверяет поля, которые возвращались API до добавления cache metadata и
   * строгой response-serialization. Новые поля допускаются только аддитивно.
   */
  const expectLegacyCacheResponse = (body: LegacyCacheResponse) => {
    expect(body).toEqual(
      expect.objectContaining({
        isCache: expect.any(Boolean),
      }),
    );
  };

  it('keeps legacy public response fields for live published schedule data', async () => {
    const server = app.getHttpServer();

    const countResponse = await request(server)
      .get('/v1/schedule/count')
      .expect(200);
    expectLegacyCacheResponse(countResponse.body);
    expect(countResponse.body).toEqual(
      expect.objectContaining({
        institutes: expect.any(Number),
        groups: expect.any(Number),
        teachers: expect.any(Number),
        audiences: expect.any(Number),
      }),
    );

    const groupsResponse = await request(server)
      .get('/v1/schedule/actual_groups?additional=false')
      .expect(200);
    expectLegacyCacheResponse(groupsResponse.body);
    expect(groupsResponse.body).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        items: expect.any(Array),
      }),
    );

    const groupName = groupsResponse.body.items
      .flatMap((institute: { groups: string[] }) => institute.groups)
      .find((group: unknown): group is string => typeof group === 'string');
    expect(groupName).toEqual(expect.any(String));

    const groupResponse = await request(server)
      .get(`/v1/schedule/group/${encodeURIComponent(groupName)}`)
      .expect(200);
    expectLegacyCacheResponse(groupResponse.body);
    expect(groupResponse.body.items).toEqual(expect.any(Array));
    expect(groupResponse.body.items.length).toBeGreaterThan(0);

    const firstLesson = groupResponse.body.items
      .flatMap((week: { days: unknown[] }) => week.days)
      .flatMap((day: { lessons: unknown[] }) => day.lessons)
      .find(Boolean);
    expect(firstLesson).toEqual(expect.any(Object));
    for (const legacyField of [
      'number',
      'timeRange',
      'originalTimeTitle',
      'parity',
      'type',
      'isStream',
      'duration',
      'durationMinutes',
      'isDivision',
    ]) {
      expect(firstLesson).toHaveProperty(legacyField);
    }
    expect(firstLesson.isStream).toEqual(expect.any(Boolean));
    expect(firstLesson.isDivision).toEqual(expect.any(Boolean));
    expect(firstLesson).not.toHaveProperty('trainingId');

    const teachersResponse = await request(server)
      .get('/v1/schedule/actual_teachers')
      .expect(200);
    expectLegacyCacheResponse(teachersResponse.body);
    expect(teachersResponse.body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        count: expect.any(Number),
      }),
    );
    const teacher = teachersResponse.body.items[0] as IdName;
    expect(teacher).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
      }),
    );

    const teacherResponse = await request(server)
      .get(`/v1/schedule/teacher/${teacher.id}`)
      .expect(200);
    expectLegacyCacheResponse(teacherResponse.body);
    expect(teacherResponse.body.teacher).toEqual(
      expect.objectContaining({
        id: teacher.id,
        name: expect.any(String),
      }),
    );
    expect(teacherResponse.body.items).toEqual(expect.any(Array));

    const audiencesResponse = await request(server)
      .get('/v1/schedule/actual_audiences')
      .expect(200);
    expectLegacyCacheResponse(audiencesResponse.body);
    expect(audiencesResponse.body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        count: expect.any(Number),
      }),
    );
    const audience = audiencesResponse.body.items[0] as IdName;
    expect(audience).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
      }),
    );

    const audienceResponse = await request(server)
      .get(`/v1/schedule/audience/${audience.id}`)
      .expect(200);
    expectLegacyCacheResponse(audienceResponse.body);
    expect(audienceResponse.body.items).toEqual(expect.any(Array));
  }, 120_000);
});
