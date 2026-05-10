import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import type { PublicRequestPerfStage } from '../performance-event-payloads';

type PerfStageEntry = { stage: PublicRequestPerfStage; stageDurationMs: number };

function appendPerfStage(ctx: Context, stage: PublicRequestPerfStage, stageDurationMs: number) {
  if (ctx.state.strapiPerfStagesEnabled !== true) {
    return;
  }
  const list = (ctx.state.strapiPerfStages ??= []) as PerfStageEntry[];
  list.push({ stage, stageDurationMs });
}

/**
 * Times work in `middleware` until it invokes `next` (Koa-style), excluding inner middleware duration.
 */
export function wrapPerfStagePreNext(
  stage: PublicRequestPerfStage,
  middleware: Core.MiddlewareHandler
): Core.MiddlewareHandler {
  return async (ctx, next) => {
    const start = Date.now();
    await middleware(ctx, async () => {
      appendPerfStage(ctx, stage, Date.now() - start);
      await next();
    });
  };
}

/**
 * Wall time for the composed inner chain (e.g. return-body + controller).
 */
export function wrapPerfControllerChain(chain: Core.MiddlewareHandler): Core.MiddlewareHandler {
  return async (ctx, next) => {
    const start = Date.now();
    await chain(ctx, next);
    appendPerfStage(ctx, 'controller', Date.now() - start);
  };
}
