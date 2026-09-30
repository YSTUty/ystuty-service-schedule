import { CalDavSyncService } from './caldav-sync.service';
import { CalDavCalendarCollection } from './caldav.types';

describe('CalDavSyncService', () => {
  const createCollection = (
    resources: CalDavCalendarCollection['resources'],
  ): CalDavCalendarCollection => ({
    name: 'ЦИС-26',
    description: 'Расписание занятий ЯГТУ для группы ЦИС-26',
    resources,
  });
  const firstResource = {
    name: 'first.ics',
    uid: 'first@ical.ystuty.ru',
    content: 'first',
    etag: '"first"',
    startsAt: new Date('2026-09-30T08:30:00.000Z'),
    endsAt: new Date('2026-09-30T10:00:00.000Z'),
  };
  const secondResource = {
    name: 'second.ics',
    uid: 'second@ical.ystuty.ru',
    content: 'second',
    etag: '"second"',
    startsAt: new Date('2026-10-01T08:30:00.000Z'),
    endsAt: new Date('2026-10-01T10:00:00.000Z'),
  };

  const createService = () => {
    const cache = new Map<string, string>();
    const redisService = {
      redis: {
        get: jest.fn(async (key: string) => cache.get(key) ?? null),
        set: jest.fn(async (key: string, value: string) => {
          cache.set(key, value);
          return 'OK';
        }),
      },
    };

    return new CalDavSyncService(redisService as any);
  };

  it('returns no resources when the sync-token describes the current collection', async () => {
    const service = createService();
    const collection = createCollection([firstResource, secondResource]);
    const snapshot = await service.getCurrentSnapshot('group:4627', collection);

    await expect(
      service.getChanges('group:4627', collection, snapshot.token),
    ).resolves.toEqual({
      isValid: true,
      token: snapshot.token,
      resources: [],
      deletedResourceNames: [],
    });
  });

  it('returns changed and deleted resources for a stored older sync-token', async () => {
    const service = createService();
    const before = createCollection([firstResource, secondResource]);
    const previousSnapshot = await service.getCurrentSnapshot(
      'group:4627',
      before,
    );
    const changedFirstResource = {
      ...firstResource,
      content: 'first changed',
      etag: '"first changed"',
    };
    const after = createCollection([changedFirstResource]);

    await expect(
      service.getChanges('group:4627', after, previousSnapshot.token),
    ).resolves.toEqual(
      expect.objectContaining({
        isValid: true,
        resources: [changedFirstResource],
        deletedResourceNames: ['second.ics'],
      }),
    );
  });

  it('invalidates a token from another collection', async () => {
    const service = createService();
    const collection = createCollection([firstResource]);
    const otherSnapshot = await service.getCurrentSnapshot(
      'teacher:42',
      collection,
    );

    await expect(
      service.getChanges('group:4627', collection, otherSnapshot.token),
    ).resolves.toEqual({ isValid: false });
  });
});
