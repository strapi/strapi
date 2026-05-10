import {
  buildPublicDatabaseQueryPerformancePayload,
  buildPublicRequestStagePayload,
  buildPublicRequestStartPayload,
  buildPublicRequestSummaryPayload,
  PERFORMANCE_PUBLIC_SCHEMA_VERSION,
} from '../performance-event-payloads';

describe('performance event payloads', () => {
  it('wraps DB perf events with schema and event versions', () => {
    const inner = {
      type: 'query.slow' as const,
      timestamp: 't',
      durationMs: 1,
      dbClient: 'postgres',
      queryFingerprint: 'fp',
      queryType: 'select' as const,
      success: true,
    };

    const slow = buildPublicDatabaseQueryPerformancePayload('performance.db.query.slow', inner);
    expect(slow.schemaVersion).toBe(PERFORMANCE_PUBLIC_SCHEMA_VERSION);
    expect(slow.eventVersion).toBe(1);
    expect(slow.queryFingerprint).toBe('fp');

    const err = buildPublicDatabaseQueryPerformancePayload('performance.db.query.error', {
      ...inner,
      type: 'query.error',
      success: false,
      errorCode: 'E',
    });
    expect(err.eventVersion).toBe(1);
    expect(err.errorCode).toBe('E');
  });

  it('aliases slowQueryCount to slowOrErrorQueryEvents on summaries', () => {
    const s = buildPublicRequestSummaryPayload({
      requestId: 'r1',
      durationMs: 10,
      method: 'GET',
      route: '/api/:id',
      path: '/api/1',
      statusCode: 200,
      dbQueryCount: 2,
      dbTotalMs: 3,
      slowQueryCount: 1,
    });

    expect(s.schemaVersion).toBe(1);
    expect(s.slowQueryCount).toBe(1);
    expect(s.slowOrErrorQueryEvents).toBe(1);
  });

  it('builds request start and stage payloads', () => {
    const start = buildPublicRequestStartPayload({
      requestId: 'r',
      method: 'POST',
      path: '/admin',
    });
    expect(start.eventVersion).toBe(1);

    const stage = buildPublicRequestStagePayload({
      requestId: 'r',
      stage: 'policy',
      stageDurationMs: 3,
    });
    expect(stage.stage).toBe('policy');
    expect(stage.schemaVersion).toBe(PERFORMANCE_PUBLIC_SCHEMA_VERSION);
  });
});
