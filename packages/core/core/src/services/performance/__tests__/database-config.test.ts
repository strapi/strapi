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
  it('uses flushIntervalMs when set', () => {
    expect(
      resolveDatabasePerformanceFlushIntervalMs(
        mockStrapi({
          'database.performance.flushIntervalMs': 3000,
        })
      )
    ).toBe(3000);
  });

  it('falls back to the default', () => {
    expect(resolveDatabasePerformanceFlushIntervalMs(mockStrapi({}))).toBe(
      DEFAULT_DATABASE_PERF_FLUSH_INTERVAL_MS
    );
  });
});

describe('resolveDatabasePerformanceMaxEvents', () => {
  it('uses maxEvents when set', () => {
    expect(
      resolveDatabasePerformanceMaxEvents(
        mockStrapi({
          'database.performance.maxEvents': 50,
        })
      )
    ).toBe(50);
  });

  it('falls back to the default', () => {
    expect(resolveDatabasePerformanceMaxEvents(mockStrapi({}))).toBe(
      DEFAULT_DATABASE_PERF_MAX_EVENTS
    );
  });
});
