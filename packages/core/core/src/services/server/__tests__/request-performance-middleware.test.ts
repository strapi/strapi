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
  requestSampleRate?: number;
  slowRequestMs?: number;
  emitStageEvents?: boolean;
  perfStats: Map<string, { count: number; totalMs: number; slowOrErrorEvents: number }>;
  emit: jest.Mock;
}): Core.Strapi {
  const {
    requestSummary = false,
    requestTracking = false,
    dbPerf = false,
    requestSampleRate = 1,
    slowRequestMs = 60_000,
    emitStageEvents = false,
    perfStats,
    emit,
  } = opts;

  return {
    config: {
      get(key: string, def?: unknown) {
        if (key === 'server.performance.requestSummaryEnabled') {
          return requestSummary;
        }
        if (key === 'server.performance.requestTrackingEnabled') {
          return requestTracking;
        }
        if (key === 'database.performance.enabled') {
          return dbPerf;
        }
        if (key === 'server.performance.requestSampleRate') {
          return requestSampleRate;
        }
        if (key === 'server.performance.slowRequestMs') {
          return slowRequestMs;
        }
        if (key === 'server.performance.emitStageEvents') {
          return emitStageEvents;
        }
        return def;
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

    expect(emit).toHaveBeenCalledWith(
      'performance.request.start',
      expect.objectContaining({
        schemaVersion: 1,
        requestId,
        method: 'GET',
        path: '/api/42',
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'performance.request.summary',
      expect.objectContaining({
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
      })
    );
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

  it('skips hub timeline when sample misses and request is faster than slowRequestMs', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const emit = jest.fn().mockResolvedValue(undefined);
    const perfStats = new Map();

    const strapi = mockStrapi({
      requestSummary: true,
      requestSampleRate: 0.5,
      slowRequestMs: 500,
      perfStats,
      emit,
    });

    const { ctx, fireFinish } = createCtxWithResHooks();

    await runRequestPerformanceMiddleware(strapi, ctx, async () => {});
    fireFinish();

    expect(emit).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('emits summary when sample misses but duration exceeds slowRequestMs', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const emit = jest.fn().mockResolvedValue(undefined);
    const perfStats = new Map();

    const strapi = mockStrapi({
      requestSummary: true,
      requestSampleRate: 0.5,
      slowRequestMs: 5,
      perfStats,
      emit,
    });

    const { ctx, fireFinish } = createCtxWithResHooks();

    let now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    await runRequestPerformanceMiddleware(strapi, ctx, async () => {
      now += 20;
    });
    fireFinish();

    expect(emit).toHaveBeenCalledWith(
      'performance.request.summary',
      expect.objectContaining({ durationMs: 20 })
    );

    jest.restoreAllMocks();
  });

  it('emits performance.request.stage entries after summary when emitStageEvents is true', async () => {
    const emit = jest.fn().mockResolvedValue(undefined);
    const perfStats = new Map();

    const strapi = mockStrapi({
      requestSummary: true,
      emitStageEvents: true,
      perfStats,
      emit,
    });

    const { ctx, fireFinish } = createCtxWithResHooks();

    let requestId = '';
    await runRequestPerformanceMiddleware(strapi, ctx, async () => {
      requestId = ctx.state.strapiPerfRequestId as string;
      ctx.state.strapiPerfStages = [
        { stage: 'auth', stageDurationMs: 2 },
        { stage: 'controller', stageDurationMs: 8 },
      ];
    });
    fireFinish();

    expect(emit).toHaveBeenCalledWith(
      'performance.request.stage',
      expect.objectContaining({
        requestId,
        stage: 'auth',
        stageDurationMs: 2,
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'performance.request.stage',
      expect.objectContaining({
        requestId,
        stage: 'controller',
        stageDurationMs: 8,
      })
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
