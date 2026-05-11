import type { Core } from '@strapi/types';

import {
  DEFAULT_DATABASE_PERF_FLUSH_INTERVAL_MS,
  DEFAULT_DATABASE_PERF_MAX_EVENTS,
  resolveDatabasePerformanceFlushIntervalMs,
  resolveDatabasePerformanceMaxEvents,
} from '../database-config';

function mockStrapi(map: Record<string, unknown>): Core.Strapi {
  return {
    config: {
      get(key: string, def?: unknown) {
        if (key in map) {
          return map[key];
        }
        return def;
      },
    },
  } as Core.Strapi;
}

describe('resolveDatabasePerformanceFlushIntervalMs', () => {
  it('prefers flushIntervalMs over legacy', () => {
    expect(
      resolveDatabasePerformanceFlushIntervalMs(
        mockStrapi({
          'database.performance.flushIntervalMs': 3000,
          'database.performance.artifactFlushIntervalMs': 9999,
        })
      )
    ).toBe(3000);
  });

  it('falls back to legacy then default', () => {
    expect(
      resolveDatabasePerformanceFlushIntervalMs(
        mockStrapi({ 'database.performance.artifactFlushIntervalMs': 8000 })
      )
    ).toBe(8000);

    expect(resolveDatabasePerformanceFlushIntervalMs(mockStrapi({}))).toBe(
      DEFAULT_DATABASE_PERF_FLUSH_INTERVAL_MS
    );
  });
});

describe('resolveDatabasePerformanceMaxEvents', () => {
  it('prefers maxEvents over legacy', () => {
    expect(
      resolveDatabasePerformanceMaxEvents(
        mockStrapi({
          'database.performance.maxEvents': 50,
          'database.performance.artifactMaxEvents': 999,
        })
      )
    ).toBe(50);
  });

  it('falls back to legacy then default', () => {
    expect(
      resolveDatabasePerformanceMaxEvents(
        mockStrapi({ 'database.performance.artifactMaxEvents': 7 })
      )
    ).toBe(7);

    expect(resolveDatabasePerformanceMaxEvents(mockStrapi({}))).toBe(
      DEFAULT_DATABASE_PERF_MAX_EVENTS
    );
  });
});
