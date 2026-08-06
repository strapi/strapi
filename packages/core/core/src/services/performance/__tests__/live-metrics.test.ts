import createEventHub from '../../event-hub';
import { createPerformanceLiveMetrics } from '../live-metrics';
import { PERFORMANCE_HUB_EVENT } from '../hub-events';

function mockStrapi(configOverrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    'server.performance.requestTrackingEnabled': true,
    'database.performance.enabled': false,
  };

  return {
    config: {
      get(key: string, def?: unknown) {
        if (key in configOverrides) {
          return configOverrides[key];
        }
        if (key in defaults) {
          return defaults[key];
        }
        return def;
      },
    },
    eventHub: createEventHub(),
  } as any;
}

const emitSummary = (
  strapi: any,
  fields: Partial<{
    durationMs: number;
    dbTotalMs: number;
    method: string;
    route: string;
    slowQueryCount: number;
  }>
) => strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY, fields);

describe('createPerformanceLiveMetrics', () => {
  it('is inert and reports inactive when tracking and DB perf are both off', async () => {
    const strapi = mockStrapi({
      'server.performance.requestTrackingEnabled': false,
      'database.performance.enabled': false,
    });
    const subscribeSpy = jest.spyOn(strapi.eventHub, 'subscribe');

    const metrics = createPerformanceLiveMetrics(strapi);

    expect(metrics.isActive()).toBe(false);
    expect(subscribeSpy).not.toHaveBeenCalled();

    const snap = metrics.snapshot();
    expect(snap.active).toBe(false);
    expect(snap.quickStats.requestSummariesInWindow).toBe(0);
    metrics.dispose();
  });

  it('aggregates request summaries into quick stats and route buckets', async () => {
    const strapi = mockStrapi();
    const metrics = createPerformanceLiveMetrics(strapi);

    await emitSummary(strapi, {
      durationMs: 10,
      dbTotalMs: 5,
      method: 'GET',
      route: '/api/articles',
      slowQueryCount: 0,
    });
    await emitSummary(strapi, {
      durationMs: 200,
      dbTotalMs: 150,
      method: 'GET',
      route: '/api/articles',
      slowQueryCount: 2,
    });
    await emitSummary(strapi, {
      durationMs: 50,
      dbTotalMs: 0,
      method: 'POST',
      route: '/api/comments',
      slowQueryCount: 0,
    });

    const snap = metrics.snapshot();

    expect(snap.active).toBe(true);
    expect(snap.scope).toBe('instance');
    expect(snap.quickStats.requestSummariesInWindow).toBe(3);
    expect(snap.quickStats.avgRequestDurationMs).toBeCloseTo((10 + 200 + 50) / 3);
    expect(snap.quickStats.slowOrErrorQueriesAttributedToRequests).toBe(2);
    // p95 lands in the slow tail bucket.
    expect(snap.quickStats.p95RequestDurationMs).toBeGreaterThanOrEqual(200);

    // Slowest route first; /api/articles averages (10+200)/2 = 105ms vs /api/comments 50ms.
    expect(snap.slowestRoutes[0]).toMatchObject({
      method: 'GET',
      route: '/api/articles',
      count: 2,
    });
    expect(snap.slowestRoutes[0].avgDurationMs).toBeCloseTo(105);

    metrics.dispose();
  });

  it('counts slow/error DB query events and ranks fingerprints', async () => {
    const strapi = mockStrapi();
    const metrics = createPerformanceLiveMetrics(strapi);

    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, {
      queryFingerprint: 'select * from a where id = ?',
      durationMs: 80,
    });
    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, {
      queryFingerprint: 'select * from a where id = ?',
      durationMs: 90,
    });
    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR, {
      queryFingerprint: 'update b set x = ?',
      durationMs: 5,
    });

    const snap = metrics.snapshot();

    expect(snap.quickStats.slowDbEventsInWindow).toBe(3);
    expect(snap.topSqlFingerprints[0]).toEqual({
      fingerprint: 'select * from a where id = ?',
      count: 2,
      totalMs: 170,
    });
    metrics.dispose();
  });

  it('stops aggregating after dispose unsubscribes from the hub', async () => {
    const strapi = mockStrapi();
    const metrics = createPerformanceLiveMetrics(strapi);

    await emitSummary(strapi, { durationMs: 10, method: 'GET', route: '/a' });
    metrics.dispose();
    await emitSummary(strapi, { durationMs: 10, method: 'GET', route: '/a' });

    expect(metrics.snapshot().quickStats.requestSummariesInWindow).toBe(1);
  });

  it('drops samples older than the rolling window', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    const base = 1_000_000_000_000;
    nowSpy.mockReturnValue(base);

    const strapi = mockStrapi();
    const metrics = createPerformanceLiveMetrics(strapi);

    await emitSummary(strapi, { durationMs: 10, method: 'GET', route: '/old' });

    // Advance beyond the full window so the old slice falls out.
    nowSpy.mockReturnValue(base + metrics.snapshot().windowMs + 60_000);
    await emitSummary(strapi, { durationMs: 20, method: 'GET', route: '/new' });

    const snap = metrics.snapshot();
    expect(snap.quickStats.requestSummariesInWindow).toBe(1);
    expect(snap.slowestRoutes[0].route).toBe('/new');

    nowSpy.mockRestore();
    metrics.dispose();
  });
});
