import { randomUUID } from 'node:crypto';

import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import {
  buildPublicRequestStagePayload,
  buildPublicRequestStartPayload,
  buildPublicRequestSummaryPayload,
  type PublicRequestPerfStage,
} from '../performance/event-payloads';
import { PERFORMANCE_HUB_EVENT } from '../performance/hub-events';
import { resolveRouteTemplate } from '../../utils/koa-route-template';
import {
  getServerRequestPerformanceEmitSettings,
  isServerRequestPerfTrackingEnabled,
} from '../../utils/server-performance-tracking';
import type { PerfQueryAgg } from '../../utils/perf-query-stats';

/**
 * Request id assignment, DB perf rollup hooks context, and `performance.request.*` hub emission.
 * Runs inside `requestCtx` + optional HTTP tracing wrapper.
 */
export async function runRequestPerformanceMiddleware(
  strapi: Core.Strapi,
  ctx: Context,
  next: () => Promise<void>
): Promise<void> {
  const dbPerformanceEnabled = strapi.config.get('database.performance.enabled') === true;
  const requestSummaryEnabled = isServerRequestPerfTrackingEnabled(strapi);
  const emitSettings = getServerRequestPerformanceEmitSettings(strapi);

  if (dbPerformanceEnabled || requestSummaryEnabled) {
    ctx.state.strapiPerfRequestId = randomUUID();
  }

  const requestId = ctx.state.strapiPerfRequestId as string | undefined;
  const startedAt = Date.now();

  if (requestSummaryEnabled && requestId) {
    ctx.state.strapiPerfSampled =
      emitSettings.requestSampleRate >= 1 ? true : Math.random() < emitSettings.requestSampleRate;
    ctx.state.strapiPerfStagesEnabled =
      emitSettings.emitStageEvents === true && requestSummaryEnabled;

    const emitStart = ctx.state.strapiPerfSampled === true || emitSettings.emitStageEvents === true;

    if (emitStart) {
      strapi.eventHub
        .emit(
          PERFORMANCE_HUB_EVENT.REQUEST_START,
          buildPublicRequestStartPayload({
            requestId,
            method: ctx.method,
            path: ctx.path,
          })
        )
        .catch(() => {});
    }
  }

  let summaryTracked = false;
  const trackSummary = () => {
    if (!requestSummaryEnabled || !requestId || summaryTracked) {
      return;
    }
    summaryTracked = true;

    const statsMap = strapi.get('perfQueryStats') as Map<string, PerfQueryAgg>;
    const dbStats = statsMap.get(requestId);
    statsMap.delete(requestId);

    const durationMs = Date.now() - startedAt;
    const sampled = ctx.state.strapiPerfSampled === true;
    const slowEnough = durationMs >= emitSettings.slowRequestMs;

    if (!sampled && !slowEnough) {
      return;
    }

    const slowQueryCount = dbStats?.slowOrErrorEvents ?? 0;
    const summaryPayload = buildPublicRequestSummaryPayload({
      requestId,
      durationMs,
      method: ctx.method,
      route: resolveRouteTemplate(ctx),
      path: ctx.path,
      statusCode: ctx.status,
      dbQueryCount: dbStats?.count ?? 0,
      dbTotalMs: dbStats?.totalMs ?? 0,
      slowQueryCount,
    });

    strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY, summaryPayload).catch(() => {
      /* fail-open */
    });

    if (emitSettings.emitStageEvents) {
      const stages = ctx.state.strapiPerfStages as
        | Array<{ stage: PublicRequestPerfStage; stageDurationMs: number }>
        | undefined;
      if (Array.isArray(stages)) {
        for (const s of stages) {
          strapi.eventHub
            .emit(
              PERFORMANCE_HUB_EVENT.REQUEST_STAGE,
              buildPublicRequestStagePayload({
                requestId,
                stage: s.stage,
                stageDurationMs: s.stageDurationMs,
              })
            )
            .catch(() => {});
        }
      }
    }
  };

  if (requestSummaryEnabled && requestId) {
    ctx.res.once('finish', trackSummary);
    ctx.res.once('close', trackSummary);
  }

  await next();
}
