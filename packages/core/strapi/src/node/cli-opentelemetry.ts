/**
 * Optional OTLP tracing for Strapi **CLI entrypoints** that run before a `Strapi` instance exists
 * (e.g. `strapi develop` cluster primary: compile TS, production admin build).
 *
 * Uses the same env conventions as app config (`examples/complex`): `STRAPI_OTEL_ENABLED`,
 * `STRAPI_OTEL_HTTP_ENDPOINT`, `STRAPI_OTEL_SERVICE_NAME`. Emits **separate** root traces from
 * in-process `strapi.startup` (best practice: do not nest app lifecycle under CLI without
 * cross-process trace propagation).
 */
import { context, ROOT_CONTEXT, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

const TRACER_NAME = '@strapi/cli';

let provider: NodeTracerProvider | null = null;
let shutdownHooked = false;

function resolveOtlpTracesUrl(): string | null {
  const enabled = process.env.STRAPI_OTEL_ENABLED;
  if (enabled !== 'true' && enabled !== '1') {
    return null;
  }
  const base = (process.env.STRAPI_OTEL_HTTP_ENDPOINT ?? 'http://127.0.0.1:4318').replace(
    /\/$/,
    ''
  );
  return `${base}/v1/traces`;
}

export function isCliOpenTelemetryEnabled(): boolean {
  return resolveOtlpTracesUrl() !== null;
}

/** Registers a minimal tracer for the current Node process (idempotent). */
export function ensureCliOpenTelemetry(): void {
  const url = resolveOtlpTracesUrl();
  if (!url || provider) {
    return;
  }

  const baseName = process.env.STRAPI_OTEL_SERVICE_NAME ?? 'strapi';
  const resource = new Resource({
    'service.name': `${baseName}-cli-primary`,
    'strapi.cli.process': 'develop-primary',
  });

  const exporter = new OTLPTraceExporter({ url });
  const nodeProvider = new NodeTracerProvider({ resource });
  nodeProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
  nodeProvider.register();
  provider = nodeProvider;

  if (!shutdownHooked) {
    shutdownHooked = true;
    const onShutdown = () => {
      shutdownCliOpenTelemetry().catch(() => {
        /* ignore */
      });
    };
    process.once('beforeExit', onShutdown);
    process.once('SIGINT', onShutdown);
    process.once('SIGTERM', onShutdown);
  }
}

export async function shutdownCliOpenTelemetry(): Promise<void> {
  if (!provider) {
    return;
  }
  const p = provider;
  provider = null;
  try {
    await p.shutdown();
  } catch {
    /* ignore */
  }
}

export async function flushCliOpenTelemetry(): Promise<void> {
  if (!provider) {
    return;
  }
  try {
    await provider.forceFlush();
  } catch {
    /* ignore */
  }
}

export async function withCliDevelopPrimaryRootSpan<T>(fn: () => Promise<T>): Promise<T> {
  if (!provider) {
    return fn();
  }

  const tracer = trace.getTracer(TRACER_NAME);
  const span = tracer.startSpan(
    'strapi.cli.develop.primary',
    { kind: SpanKind.INTERNAL },
    ROOT_CONTEXT
  );
  span.setAttribute('strapi.process.role', 'develop-cluster-primary');

  try {
    return await context.with(trace.setSpan(ROOT_CONTEXT, span), fn);
  } catch (error) {
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}

export async function withCliSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!provider) {
    return fn();
  }

  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(name, { kind: SpanKind.INTERNAL }, async (span) => {
    try {
      return await fn();
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
