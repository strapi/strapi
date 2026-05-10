import { randomUUID } from 'node:crypto';

import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import { buildPublicRequestSummaryPayload } from '../performance-event-payloads';
import { resolveRouteTemplate } from '../../utils/koa-route-template';
import { isServerRequestPerfTrackingEnabled } from '../../utils/server-performance-tracking';
import type { PerfQueryAgg } from '../../utils/perf-query-stats';

/**
 * Request id assignment, DB perf rollup hooks context, and `performance.request.summary` emission.
 * Runs inside `requestCtx` + optional HTTP tracing wrapper.
 */
export async function runRequestPerformanceMiddleware(
  strapi: Core.Strapi,
  ctx: Context,
  next: () => Promise<void>
): Promise<void> {
  const dbPerformanceEnabled = strapi.config.get('database.performance.enabled') === true;
  const requestSummaryEnabled = isServerRequestPerfTrackingEnabled(strapi);

  if (dbPerformanceEnabled || requestSummaryEnabled) {
    ctx.state.strapiPerfRequestId = randomUUID();
  }

  const requestId = ctx.state.strapiPerfRequestId as string | undefined;
  const startedAt = Date.now();

  let summaryTracked = false;
  const trackSummary = () => {
    if (!requestSummaryEnabled || !requestId || summaryTracked) {
      return;
    }
    summaryTracked = true;

    const statsMap = strapi.get('perfQueryStats') as Map<string, PerfQueryAgg>;
    const dbStats = statsMap.get(requestId);
    statsMap.delete(requestId);

    const slowQueryCount = dbStats?.slowOrErrorEvents ?? 0;
    const summaryPayload = buildPublicRequestSummaryPayload({
      requestId,
      durationMs: Date.now() - startedAt,
      method: ctx.method,
      route: resolveRouteTemplate(ctx),
      path: ctx.path,
      statusCode: ctx.status,
      dbQueryCount: dbStats?.count ?? 0,
      dbTotalMs: dbStats?.totalMs ?? 0,
      slowQueryCount,
    });

    strapi.eventHub.emit('performance.request.summary', summaryPayload).catch(() => {
      /* fail-open */
    });
  };

  if (requestSummaryEnabled && requestId) {
    ctx.res.once('finish', trackSummary);
    ctx.res.once('close', trackSummary);
  }

  await next();
}
