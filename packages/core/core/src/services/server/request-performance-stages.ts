import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import { isRouteHandlerStageTracingEnabled } from '../observability/opentelemetry-tracing';
import type { PublicRequestPerfStage } from '../performance/event-payloads';

type PerfStageEntry = { stage: PublicRequestPerfStage; stageDurationMs: number };

const ROUTE_STAGE_TRACER = '@strapi/core.http.route';

function appendPerfStage(ctx: Context, stage: PublicRequestPerfStage, stageDurationMs: number) {
  if (ctx.state.strapiPerfStagesEnabled !== true) {
    return;
  }
  const list = (ctx.state.strapiPerfStages ??= []) as PerfStageEntry[];
  list.push({ stage, stageDurationMs });
}

function routeStageSpanName(stage: PublicRequestPerfStage | 'controller'): string {
  return stage === 'controller' ? 'strapi.http.route.controller' : `strapi.http.route.${stage}`;
}

function setRouteStageAttributes(
  span: Span,
  ctx: Context,
  stage: PublicRequestPerfStage | 'controller'
): void {
  span.setAttribute('strapi.route.stage', stage);
  span.setAttribute('http.request.method', ctx.method);
  const routePath = ctx.state.route?.path;
  if (typeof routePath === 'string' && routePath.length > 0) {
    span.setAttribute('http.route', routePath);
  }
}

/**
 * Times work in `middleware` until it invokes `next` (Koa-style), excluding inner middleware duration.
 */
export function wrapPerfStagePreNext(
  strapi: Core.Strapi,
  stage: PublicRequestPerfStage,
  middleware: Core.MiddlewareHandler
): Core.MiddlewareHandler {
  return async (ctx, next) => {
    const start = Date.now();
    const tracingStages = isRouteHandlerStageTracingEnabled(strapi);

    const runInner = async () => {
      appendPerfStage(ctx, stage, Date.now() - start);
      await next();
    };

    if (!tracingStages) {
      await middleware(ctx, runInner);
      return;
    }

    const tracer = trace.getTracer(ROUTE_STAGE_TRACER);
    const span = tracer.startSpan(routeStageSpanName(stage), { kind: SpanKind.INTERNAL });
    setRouteStageAttributes(span, ctx, stage);
    const ctxWithSpan = trace.setSpan(context.active(), span);

    let spanEnded = false;
    try {
      await context.with(ctxWithSpan, async () => {
        await middleware(ctx, async () => {
          appendPerfStage(ctx, stage, Date.now() - start);
          if (!spanEnded) {
            spanEnded = true;
            span.end();
          }
          await next();
        });
      });
    } catch (error) {
      if (!spanEnded) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
      }
      throw error;
    }
  };
}

/**
 * Wall time for the composed inner chain (e.g. return-body + controller).
 */
export function wrapPerfControllerChain(
  strapi: Core.Strapi,
  chain: Core.MiddlewareHandler
): Core.MiddlewareHandler {
  return async (ctx, next) => {
    const start = Date.now();
    const tracingStages = isRouteHandlerStageTracingEnabled(strapi);

    if (!tracingStages) {
      await chain(ctx, next);
      appendPerfStage(ctx, 'controller', Date.now() - start);
      return;
    }

    const tracer = trace.getTracer(ROUTE_STAGE_TRACER);
    const span = tracer.startSpan(routeStageSpanName('controller'), { kind: SpanKind.INTERNAL });
    setRouteStageAttributes(span, ctx, 'controller');
    const ctxWithSpan = trace.setSpan(context.active(), span);

    try {
      await context.with(ctxWithSpan, async () => {
        await chain(ctx, next);
      });
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
      appendPerfStage(ctx, 'controller', Date.now() - start);
    }
  };
}
