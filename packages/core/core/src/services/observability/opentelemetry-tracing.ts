import type { Context, Next } from 'koa';
import type { Core } from '@strapi/types';
import {
  context,
  defaultTextMapGetter,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
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

const SERVICE_NAME_ATTR = 'service.name';

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

/** Starts the Node SDK and wires `trace`/propagation globals. Call from provider `register`. */
export function registerOpenTelemetryTracing(strapi: Core.Strapi): void {
  if (!isTracingConfigEnabled(strapi)) {
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
    const parentContext = context.active();
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
  disposeKnexListeners?.();
  disposeKnexListeners = null;

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
  koaCtx: Context,
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

  return tracer.startActiveSpan(spanName, { kind: SpanKind.INTERNAL }, async (span) => {
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
  });
}

/**
 * Runs `fn` inside an INTERNAL span when `server.observability.tracing.enabled` is true.
 * Records `strapi.content_api.phase.duration_ms` when observability metrics OTLP is active.
 * Used for Content API validate/sanitize work nested under the HTTP SERVER span.
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
 * Wraps `strapi.documents(uid).…` calls from the Core REST API service layer.
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
