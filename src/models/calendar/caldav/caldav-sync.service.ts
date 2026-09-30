import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { RedisService } from '../../redis/redis.service';

import {
  CalDavCalendarCollection,
  CalDavSyncResult,
  CalDavSyncSnapshot,
} from './caldav.types';

const SNAPSHOT_TTL_SECONDS = 60 * 60 * 24 * 30;
const TOKEN_PREFIX = 'urn:ystuty:caldav:sync:';

/**
 * Хранит недавние состояния collection для `sync-collection` из RFC 6578.
 * Redis нужен только для оптимизации: при его недоступности CalDAV продолжает
 * работать, но клиенту может понадобиться полная повторная синхронизация.
 */
@Injectable()
export class CalDavSyncService {
  private readonly logger = new Logger(CalDavSyncService.name);
  private readonly memorySnapshots = new Map<string, CalDavSyncSnapshot>();

  constructor(private readonly redisService: RedisService) {}

  async getCurrentSnapshot(
    collectionKey: string,
    collection: CalDavCalendarCollection,
  ): Promise<CalDavSyncSnapshot> {
    const snapshot = this.createSnapshot(collectionKey, collection);
    await this.saveSnapshot(collectionKey, snapshot);

    return snapshot;
  }

  /** Возвращает изменившиеся и удалённые resources после sync-token клиента. */
  async getChanges(
    collectionKey: string,
    collection: CalDavCalendarCollection,
    requestedToken: string | null,
  ): Promise<CalDavSyncResult> {
    const currentSnapshot = await this.getCurrentSnapshot(
      collectionKey,
      collection,
    );
    if (!requestedToken) {
      return {
        isValid: true,
        token: currentSnapshot.token,
        resources: collection.resources,
        deletedResourceNames: [],
      };
    }

    // Детерминированный текущий token не требует хранения snapshot: у клиента
    // уже точно актуальная версия collection.
    if (requestedToken === currentSnapshot.token) {
      return {
        isValid: true,
        token: currentSnapshot.token,
        resources: [],
        deletedResourceNames: [],
      };
    }

    const previousSnapshot = await this.getSnapshot(
      collectionKey,
      requestedToken,
    );
    if (!previousSnapshot) {
      return { isValid: false };
    }

    const resources = collection.resources.filter(
      (resource) =>
        previousSnapshot.resourceEtags[resource.name] !== resource.etag,
    );
    const currentResourceNames = new Set(
      collection.resources.map((resource) => resource.name),
    );
    const deletedResourceNames = Object.keys(
      previousSnapshot.resourceEtags,
    ).filter((name) => !currentResourceNames.has(name));

    return {
      isValid: true,
      token: currentSnapshot.token,
      resources,
      deletedResourceNames,
    };
  }

  private createSnapshot(
    collectionKey: string,
    collection: CalDavCalendarCollection,
  ): CalDavSyncSnapshot {
    const resourceEtags = Object.fromEntries(
      collection.resources
        .map((resource) => [resource.name, resource.etag])
        .sort(([leftName], [rightName]) => leftName.localeCompare(rightName)),
    );
    const collectionHash = this.createHash(collectionKey);
    const stateHash = this.createHash(JSON.stringify(resourceEtags));

    return {
      token: `${TOKEN_PREFIX}${collectionHash}:${stateHash}`,
      resourceEtags,
    };
  }

  private async saveSnapshot(
    collectionKey: string,
    snapshot: CalDavSyncSnapshot,
  ): Promise<void> {
    const cacheKey = this.getSnapshotCacheKey(collectionKey, snapshot.token);
    this.memorySnapshots.set(cacheKey, snapshot);

    try {
      await this.redisService.redis.set(
        cacheKey,
        JSON.stringify(snapshot),
        'EX',
        SNAPSHOT_TTL_SECONDS,
      );
    } catch (error) {
      const redisError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.warn(
        `Redis CalDAV sync snapshot write failed: ${redisError.message}`,
      );
    }
  }

  private async getSnapshot(
    collectionKey: string,
    token: string,
  ): Promise<CalDavSyncSnapshot | null> {
    const cacheKey = this.getSnapshotCacheKey(collectionKey, token);
    const memorySnapshot = this.memorySnapshots.get(cacheKey);
    if (memorySnapshot) {
      return memorySnapshot;
    }

    try {
      const snapshot = await this.redisService.redis.get(cacheKey);
      if (!snapshot) {
        return null;
      }

      const parsed = JSON.parse(snapshot) as CalDavSyncSnapshot;
      if (!this.isSnapshot(parsed)) {
        return null;
      }
      this.memorySnapshots.set(cacheKey, parsed);

      return parsed;
    } catch (error) {
      const redisError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.warn(
        `Redis CalDAV sync snapshot read failed: ${redisError.message}`,
      );
      return null;
    }
  }

  private getSnapshotCacheKey(collectionKey: string, token: string): string {
    return `caldav:sync:v1:${this.createHash(collectionKey)}:${this.createHash(token)}`;
  }

  private createHash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private isSnapshot(value: unknown): value is CalDavSyncSnapshot {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const snapshot = value as Partial<CalDavSyncSnapshot>;

    return (
      typeof snapshot.token === 'string' &&
      snapshot.token.startsWith(TOKEN_PREFIX) &&
      !!snapshot.resourceEtags &&
      typeof snapshot.resourceEtags === 'object'
    );
  }
}
