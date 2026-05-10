import type { Context } from 'koa';

import type { Core } from '@strapi/types';

import { mergeQueryTelemetryIntoStats } from '../../../utils/perf-query-stats';
import { runRequestPerformanceMiddleware } from '../request-performance-middleware';

function createCtxWithResHooks(): {
  ctx: Context;
  fireFinish: () => void;
} {
  const finishHandlers: Array<() => void> = [];
  const closeHandlers: Array<() => void> = [];

  const res = {
    once: jest.fn((event: string, fn: () => void) => {
      if (event === 'finish') {
        finishHandlers.push(fn);
      }
      if (event === 'close') {
        closeHandlers.push(fn);
      }
    }),
  };

  const ctx = {
    method: 'GET',
    path: '/api/42',
    status: 200,
    state: {} as Record<string, unknown>,
    _matchedRoute: '/api/:id',
    res,
  } as unknown as Context;

  return {
    ctx,
    fireFinish() {
      finishHandlers.forEach((fn) => fn());
      closeHandlers.forEach((fn) => fn());
    },
  };
}

function mockStrapi(opts: {
  requestSummary?: boolean;
  requestTracking?: boolean;
  dbPerf?: boolean;
  perfStats: Map<string, { count: number; totalMs: number; slowOrErrorEvents: number }>;
  emit: jest.Mock;
}): Core.Strapi {
  const { requestSummary = false, requestTracking = false, dbPerf = false, perfStats, emit } = opts;

  return {
    config: {
      get(key: string) {
        if (key === 'server.performance.requestSummaryEnabled') {
          return requestSummary;
        }
        if (key === 'server.performance.requestTrackingEnabled') {
          return requestTracking;
        }
        if (key === 'database.performance.enabled') {
          return dbPerf;
        }
        return undefined;
      },
    },
    eventHub: {
      emit,
    },
    get(name: string) {
      if (name === 'perfQueryStats') {
        return perfStats;
      }
      throw new Error(`unexpected get ${name}`);
    },
  } as unknown as Core.Strapi;
}

describe('runRequestPerformanceMiddleware', () => {
  it('emits versioned performance.request.summary on response finish with rollup stats', async () => {
    const emit = jest.fn().mockResolvedValue(undefined);
    const perfStats = new Map<
      string,
      { count: number; totalMs: number; slowOrErrorEvents: number }
    >();

    const strapi = mockStrapi({
      requestSummary: true,
      perfStats,
      emit,
    });

    const { ctx, fireFinish } = createCtxWithResHooks();

    let requestId = '';
    await runRequestPerformanceMiddleware(strapi, ctx, async () => {
      requestId = ctx.state.strapiPerfRequestId as string;
      mergeQueryTelemetryIntoStats(perfStats, requestId, 15, true);
      mergeQueryTelemetryIntoStats(perfStats, requestId, 5, false);
      ctx.status = 201;
    });

    fireFinish();

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toBe('performance.request.summary');
    expect(emit.mock.calls[0][1]).toMatchObject({
      schemaVersion: 1,
      eventVersion: 1,
      requestId,
      method: 'GET',
      route: '/api/:id',
      path: '/api/42',
      statusCode: 201,
      dbQueryCount: 2,
      dbTotalMs: 20,
      slowQueryCount: 1,
      slowOrErrorQueryEvents: 1,
    });
    expect(perfStats.has(requestId)).toBe(false);
  });

  it('enables summaries when only requestTrackingEnabled is true', async () => {
    const emit = jest.fn().mockResolvedValue(undefined);
    const perfStats = new Map();

    const strapi = mockStrapi({
      requestTracking: true,
      perfStats,
      emit,
    });

    const { ctx, fireFinish } = createCtxWithResHooks();

    let requestId = '';
    await runRequestPerformanceMiddleware(strapi, ctx, async () => {
      requestId = ctx.state.strapiPerfRequestId as string;
    });
    fireFinish();

    expect(emit).toHaveBeenCalledWith(
      'performance.request.summary',
      expect.objectContaining({ requestId })
    );
  });

  it('does not emit summary when tracking flags are off', async () => {
    const emit = jest.fn().mockResolvedValue(undefined);
    const perfStats = new Map();

    const strapi = mockStrapi({
      perfStats,
      emit,
    });

    const { ctx, fireFinish } = createCtxWithResHooks();

    await runRequestPerformanceMiddleware(strapi, ctx, async () => {});
    fireFinish();

    expect(emit).not.toHaveBeenCalled();
  });

  it('assigns strapiPerfRequestId when only database.performance.enabled is true', async () => {
    const emit = jest.fn().mockResolvedValue(undefined);
    const perfStats = new Map();

    const strapi = mockStrapi({
      dbPerf: true,
      perfStats,
      emit,
    });

    const { ctx, fireFinish } = createCtxWithResHooks();

    let requestId = '';
    await runRequestPerformanceMiddleware(strapi, ctx, async () => {
      requestId = ctx.state.strapiPerfRequestId as string;
    });
    fireFinish();

    expect(requestId).toEqual(expect.any(String));
    expect(requestId.length).toBeGreaterThan(0);
    expect(emit).not.toHaveBeenCalled();
  });
});
