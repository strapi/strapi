import type { Context as KoaContext, Next } from 'koa';
import type { Core } from '@strapi/types';
import { setRequestWorkTraceParentContextResolver } from '@strapi/utils';
import {
  context,
  defaultTextMapGetter,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  type Context as OtelContext,
  type Span,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  NodeTracerProvider,
  ParentBasedSampler,
  SimpleSpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';

import {
  recordContentApiPhaseDuration,
  recordDocumentServiceOperationDuration,
} from './opentelemetry-performance-metrics';
import {
  inferDbOperation,
  mapDatabaseClientToDbSystem,
  truncateSql,
} from './opentelemetry-tracing-utils';
import { disposeBcryptjsTracing } from './opentelemetry-bcryptjs';
import requestCtx from '../request-context';

const SERVICE_NAME_ATTR = 'service.name';

/**
 * Koa `ctx.state` entry: OpenTelemetry `Context` for the innermost traced HTTP handler
 * (server span, then route controller span). Used when `context.active()` no longer reflects
 * route work (e.g. DB driver callbacks) so spans still nest under the controller in Jaeger.
 */
export const STRAPI_OTEL_KOA_HANDLER_CONTEXT = Symbol.for('strapi.otel.koaHandlerContext');

/** Span id of the root HTTP SERVER span for this request (driver callbacks reset ALS back to it). */
const STRAPI_OTEL_HTTP_SERVER_SPAN_ID = Symbol.for('strapi.otel.httpServerSpanId');

/**
 * Parent context for spans started during HTTP handling (DB, documents, content-api, admin
 * permissions). pg/mysql often reset AsyncLocalStorage so `context.active()` becomes the root
 * HTTP SERVER span while `ctx.state[strapi.otel.koaHandlerContext]` still points at
 * `strapi.http.route.controller` — prefer the latter in that case so work nests under the route.
 */
function getTraceParentContextForHttpHandlerWork(): OtelContext {
  const active = context.active();
  const activeSpan = trace.getSpan(active);

  const koaCtx = requestCtx.get();
  const state = koaCtx != null ? (koaCtx.state as Record<string | symbol, unknown>) : undefined;

  const storedRaw = state?.[STRAPI_OTEL_KOA_HANDLER_CONTEXT];
  const serverSpanIdRaw = state?.[STRAPI_OTEL_HTTP_SERVER_SPAN_ID];
  const serverSpanId = typeof serverSpanIdRaw === 'string' ? serverSpanIdRaw : undefined;

  if (storedRaw == null) {
    return active;
  }

  const stored = storedRaw as OtelContext;
  const storedSpan = trace.getSpan(stored);

  if (storedSpan === undefined) {
    return active;
  }

  if (activeSpan === undefined) {
    return stored;
  }

  const activeId = activeSpan.spanContext().spanId;
  const storedId = storedSpan.spanContext().spanId;

  if (serverSpanId !== undefined && activeId === serverSpanId && activeId !== storedId) {
    return stored;
  }

  return active;
}

function resolveKnexSpanParentContext(): OtelContext {
  return getTraceParentContextForHttpHandlerWork();
}

function setKoaOtelHandlerContext(koaCtx: KoaContext, otelCtx: OtelContext): void {
  (koaCtx.state as Record<string | symbol, unknown>)[STRAPI_OTEL_KOA_HANDLER_CONTEXT] = otelCtx;
}

function clearKoaOtelHandlerContext(koaCtx: KoaContext): void {
  delete (koaCtx.state as Record<string | symbol, unknown>)[STRAPI_OTEL_KOA_HANDLER_CONTEXT];
}

/** Knex query event payload (`query`, `query-response`, `query-error`). */
interface KnexQueryEvent {
  __knexQueryUid?: string;
  sql?: string;
  method?: string;
}

interface KnexEmitter {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  off(event: string, listener: (...args: unknown[]) => void): unknown;
}

let nodeProvider: NodeTracerProvider | null = null;
let disposeKnexListeners: (() => void) | null = null;

const isTracingConfigEnabled = (strapi: Core.Strapi): boolean =>
  strapi.config.get('server.observability.tracing.enabled') === true;

/** When tracing is on, adds `strapi.http.route.*` spans around auth/policy/middleware/controller (default: true). */
export const isRouteHandlerStageTracingEnabled = (strapi: Core.Strapi): boolean => {
  if (!isTracingConfigEnabled(strapi) || !nodeProvider) {
    return false;
  }
  return strapi.config.get('server.observability.tracing.recordRouteHandlerStages') !== false;
};

const STARTUP_TRACER_NAME = '@strapi/core.startup';

/**
 * INTERNAL span for Strapi startup phases (`register`, `bootstrap`, `listen`).
 * Uses root spans when `root: true` so startup appears as its own trace in Jaeger.
 */
export async function withStartupSpan<T>(
  strapi: Core.Strapi,
  spanName: string,
  fn: () => Promise<T>,
  options?: { root?: boolean }
): Promise<T> {
  if (!isTracingConfigEnabled(strapi) || !nodeProvider) {
    return fn();
  }

  const tracer = trace.getTracer(STARTUP_TRACER_NAME);
  const parentContext = options?.root === true ? ROOT_CONTEXT : undefined;

  const runInSpan = async (span: Span) => {
    try {
      return await fn();
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  };

  if (parentContext !== undefined) {
    return tracer.startActiveSpan(spanName, { kind: SpanKind.INTERNAL }, parentContext, runInSpan);
  }

  return tracer.startActiveSpan(spanName, { kind: SpanKind.INTERNAL }, runInSpan);
}

/**
 * Runs `fn` under a root `strapi.startup` span without ending it yet.
 * Used when `load()` runs before `start()` so `strapi.startup.listen` stays in the same trace
 * (for example `strapi develop`).
 *
 * If `start()` never runs, call {@link endDeferredStartupRootSpan} from `destroy()` (Strapi does this).
 */
export async function beginDeferredStartupRootSpan(
  strapi: Core.Strapi,
  fn: () => Promise<void>
): Promise<Span | undefined> {
  if (!isTracingConfigEnabled(strapi) || !nodeProvider) {
    await fn();
    return undefined;
  }

  const tracer = trace.getTracer(STARTUP_TRACER_NAME);
  const span = tracer.startSpan('strapi.startup', { kind: SpanKind.INTERNAL }, ROOT_CONTEXT);
  const ctxWithSpan = trace.setSpan(ROOT_CONTEXT, span);

  try {
    await context.with(ctxWithSpan, fn);
  } catch (error) {
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    throw error;
  }

  return span;
}

/** Runs `fn` with the deferred root startup span active (wrap `strapi.startup.listen`). */
export async function continueDeferredStartupRootSpan<T>(
  span: Span,
  fn: () => Promise<T>
): Promise<T> {
  const ctxWithSpan = trace.setSpan(ROOT_CONTEXT, span);
  return context.with(ctxWithSpan, fn);
}

/** Ends the span from {@link beginDeferredStartupRootSpan}; no-op for `undefined`. */
export function endDeferredStartupRootSpan(span: Span | undefined): void {
  span?.end();
}

/**
 * Runs `fn` as a child of an explicit parent span (typically the deferred `strapi.startup` root
 * left open after `load()` until `start()`). Used by the develop CLI and any other code that
 * runs between load and listen so Jaeger shows where time goes.
 */
export async function withStartupTraceChildPhase<T>(
  parentSpan: Span | undefined,
  strapi: Core.Strapi,
  spanName: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!parentSpan || !isTracingConfigEnabled(strapi) || !nodeProvider) {
    return fn();
  }

  const ctx = trace.setSpan(ROOT_CONTEXT, parentSpan);
  return context.with(ctx, () => withStartupSpan(strapi, spanName, fn));
}

/** Starts the Node SDK and wires `trace`/propagation globals. Call from provider `register`. */
export function registerOpenTelemetryTracing(strapi: Core.Strapi): void {
  if (!isTracingConfigEnabled(strapi)) {
    setRequestWorkTraceParentContextResolver(undefined);
    return;
  }

  if (nodeProvider) {
    strapi.log.warn(
      '[observability.tracing] OpenTelemetry tracer provider already registered; skipping duplicate init.'
    );
    return;
  }

  type TracingConfig = NonNullable<NonNullable<Core.Config.Server['observability']>['tracing']>;
  const cfg = strapi.config.get('server.observability.tracing') as
    | Partial<TracingConfig>
    | undefined;

  const serviceName = cfg?.serviceName ?? 'strapi';

  let sampler: ParentBasedSampler | undefined;

  const rate = cfg?.sampleRate;
  if (typeof rate === 'number' && rate >= 0 && rate < 1) {
    sampler = new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(rate) });
  }

  const resource = new Resource({
    [SERVICE_NAME_ATTR]: serviceName,
  });

  nodeProvider = new NodeTracerProvider({
    resource,
    ...(sampler ? { sampler } : {}),
  });

  if (cfg?.consoleExporter === true) {
    nodeProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  const otlp = cfg?.otlp;
  if (otlp?.enabled === true && typeof otlp.url === 'string' && otlp.url.length > 0) {
    const exporter = new OTLPTraceExporter({
      url: otlp.url,
      headers: otlp.headers,
    });
    nodeProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
  }

  nodeProvider.register({
    propagator: new W3CTraceContextPropagator(),
  });

  setRequestWorkTraceParentContextResolver(() => getTraceParentContextForHttpHandlerWork());
}

/** Subscribes to Knex `query` lifecycle on `strapi.db.connection`. Call from provider `bootstrap`. */
export function attachKnexQueryTracing(strapi: Core.Strapi): void {
  if (!isTracingConfigEnabled(strapi) || !nodeProvider) {
    return;
  }

  if (disposeKnexListeners) {
    return;
  }

  const knex = strapi.db.connection as KnexEmitter;

  const inflight = new Map<string, Span>();

  const getDbSystem = () =>
    mapDatabaseClientToDbSystem(
      strapi.config.get('database.connection.client') as string | undefined
    );

  const onQuery = (queryData: KnexQueryEvent) => {
    const uid = queryData.__knexQueryUid;
    if (!uid) {
      return;
    }

    const tracer = trace.getTracer('@strapi/core.db');
    const parentContext = resolveKnexSpanParentContext();
    const op = inferDbOperation(queryData.sql, queryData.method);
    const span = tracer.startSpan(`db.${op}`, { kind: SpanKind.CLIENT }, parentContext);

    span.setAttribute('db.system', getDbSystem());
    span.setAttribute('db.operation', op);
    if (typeof queryData.sql === 'string' && queryData.sql.length > 0) {
      span.setAttribute('db.statement', truncateSql(queryData.sql));
    }

    inflight.set(uid, span);
  };

  const finish = (queryData: KnexQueryEvent, ok: boolean, error?: unknown) => {
    const uid = queryData.__knexQueryUid;
    if (!uid) {
      return;
    }

    const span = inflight.get(uid);
    if (!span) {
      return;
    }

    inflight.delete(uid);

    if (!ok) {
      if (error instanceof Error) {
        span.recordException(error);
      } else if (error != null) {
        span.recordException(new Error(String(error)));
      }

      span.setStatus({ code: SpanStatusCode.ERROR });
    }

    span.end();
  };

  const onQueryResponse = (_response: unknown, queryData: KnexQueryEvent) =>
    finish(queryData, true);
  const onQueryError = (err: unknown, queryData: KnexQueryEvent) => finish(queryData, false, err);

  knex.on('query', onQuery as (...args: unknown[]) => void);
  knex.on('query-response', onQueryResponse as (...args: unknown[]) => void);
  knex.on('query-error', onQueryError as (...args: unknown[]) => void);

  disposeKnexListeners = () => {
    inflight.clear();
    knex.off('query', onQuery as (...args: unknown[]) => void);
    knex.off('query-response', onQueryResponse as (...args: unknown[]) => void);
    knex.off('query-error', onQueryError as (...args: unknown[]) => void);
    disposeKnexListeners = null;
  };
}

/** Flushes exporters and clears Knex subscriptions. Safe to call when tracing was disabled. */
export async function shutdownOpenTelemetryTracing(strapi: Core.Strapi): Promise<void> {
  setRequestWorkTraceParentContextResolver(undefined);

  disposeKnexListeners?.();
  disposeKnexListeners = null;

  disposeBcryptjsTracing();

  if (!nodeProvider) {
    return;
  }

  try {
    await nodeProvider.shutdown();
  } catch (error) {
    strapi.log.warn(`[observability.tracing] Failed to shutdown tracer provider cleanly: ${error}`);
  }

  nodeProvider = null;
}

/** HTTP span + trace context propagation; no-op unless `server.observability.tracing.enabled` is true. */
export async function withHttpServerTracing(
  strapi: Core.Strapi,
  koaCtx: KoaContext,
  next: Next
): Promise<void> {
  if (!isTracingConfigEnabled(strapi)) {
    await next();
    return;
  }

  const parentContext = propagation.extract(ROOT_CONTEXT, koaCtx.headers, defaultTextMapGetter);

  await context.with(parentContext, async () => {
    const tracer = trace.getTracer('@strapi/core.http');

    await tracer.startActiveSpan(
      `${koaCtx.method} ${koaCtx.path}`,
      { kind: SpanKind.SERVER },
      async (span) => {
        span.setAttribute('http.request.method', koaCtx.method);
        span.setAttribute('http.target', koaCtx.path);

        const url = typeof koaCtx.URL?.toString === 'function' ? koaCtx.URL.toString() : undefined;
        if (url && url !== 'undefined') {
          span.setAttribute('http.url', url);
        }

        const sc = span.spanContext();
        (koaCtx.state as Record<string | symbol, unknown>)[STRAPI_OTEL_HTTP_SERVER_SPAN_ID] =
          sc.spanId;

        setKoaOtelHandlerContext(koaCtx, context.active());

        try {
          await next();
          span.setAttribute('http.response.status_code', koaCtx.status);
          if (koaCtx.status >= 500) {
            span.setStatus({ code: SpanStatusCode.ERROR });
          }
        } catch (error) {
          span.setAttribute('http.response.status_code', koaCtx.status);
          span.recordException(error instanceof Error ? error : new Error(String(error)));
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          clearKoaOtelHandlerContext(koaCtx);
          delete (koaCtx.state as Record<string | symbol, unknown>)[
            STRAPI_OTEL_HTTP_SERVER_SPAN_ID
          ];
          span.end();
        }
      }
    );
  });
}

const CONTENT_API_TRACER_NAME = '@strapi/core.content-api';
const DOCUMENT_SERVICE_TRACER_NAME = '@strapi/core.document-service';

async function runWithOptionalInternalSpan<T>(
  strapi: Core.Strapi | undefined,
  options: {
    tracerName: string;
    spanName: string;
    attributes: Record<string, string | number | boolean | undefined>;
    emitMetric: () => void;
  },
  fn: () => Promise<T>
): Promise<T> {
  const { tracerName, spanName, attributes, emitMetric } = options;

  if (!strapi || !isTracingConfigEnabled(strapi)) {
    try {
      return await fn();
    } finally {
      emitMetric();
    }
  }

  const tracer = trace.getTracer(tracerName);
  const parentContext = getTraceParentContextForHttpHandlerWork();

  return tracer.startActiveSpan(
    spanName,
    { kind: SpanKind.INTERNAL },
    parentContext,
    async (span) => {
      try {
        for (const [key, value] of Object.entries(attributes)) {
          if (value !== undefined) {
            span.setAttribute(key, value);
          }
        }

        return await fn();
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
        emitMetric();
      }
    }
  );
}

/**
 * Runs `fn` inside an INTERNAL span when `server.observability.tracing.enabled` is true.
 * Records `strapi.content_api.phase.duration_ms` when observability metrics OTLP is active.
 * Used for Content API validate/sanitize work nested under the HTTP route (controller) span.
 */
export async function withContentApiSpan<T>(
  strapi: Core.Strapi | undefined,
  spanName: string,
  attributes: Record<string, string | number | boolean | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  const startMs = performance.now();
  const uid =
    typeof attributes['strapi.content_type.uid'] === 'string'
      ? attributes['strapi.content_type.uid']
      : undefined;

  return runWithOptionalInternalSpan(
    strapi,
    {
      tracerName: CONTENT_API_TRACER_NAME,
      spanName,
      attributes,
      emitMetric() {
        recordContentApiPhaseDuration(strapi, uid, spanName, performance.now() - startMs);
      },
    },
    fn
  );
}

/**
 * Wraps `strapi.documents(uid).{operation}(…)` (document-service middleware).
 * INTERNAL span `strapi.documents.{operation}` when tracing is on; histogram
 * `strapi.document_service.operation.duration_ms` when metrics OTLP is on.
 */
export async function withDocumentServiceObservation<T>(
  strapi: Core.Strapi | undefined,
  operation: string,
  contentTypeUid: string,
  fn: () => Promise<T>
): Promise<T> {
  const spanName = `strapi.documents.${operation}`;
  const startMs = performance.now();
  const spanAttrs = { 'strapi.content_type.uid': contentTypeUid };

  return runWithOptionalInternalSpan(
    strapi,
    {
      tracerName: DOCUMENT_SERVICE_TRACER_NAME,
      spanName,
      attributes: spanAttrs,
      emitMetric() {
        recordDocumentServiceOperationDuration(
          strapi,
          contentTypeUid,
          operation,
          performance.now() - startMs
        );
      },
    },
    fn
  );
}
