import {
  context,
  SpanKind,
  SpanStatusCode,
  trace,
  type Context as OtelContext,
} from '@opentelemetry/api';

const ADMIN_PERMISSIONS_TRACER_NAME = '@strapi/core.admin.permissions';

/** Narrow shape so `@strapi/utils` does not depend on `@strapi/types` (avoids Nx cycle). */
export type AdminPermissionsObservabilityStrapi = {
  config: { get(key: string): unknown };
};

type PhaseMetricsRecorder = (
  strapi: AdminPermissionsObservabilityStrapi | undefined,
  contentTypeUid: string | undefined,
  phase: string,
  durationMs: number
) => void;

let phaseMetricsRecorder: PhaseMetricsRecorder | undefined;

/**
 * Wired from `@strapi/core` when HTTP tracing initializes. Lets internal spans nest under
 * `strapi.http.route.controller` when DB drivers reset `context.active()` to the HTTP SERVER span.
 */
let requestWorkTraceParentContextResolver: (() => OtelContext) | undefined;

export function setRequestWorkTraceParentContextResolver(
  resolver: (() => OtelContext) | undefined
): void {
  requestWorkTraceParentContextResolver = resolver;
}

function resolveRequestWorkParentContext(): OtelContext {
  return requestWorkTraceParentContextResolver?.() ?? context.active();
}

/**
 * Wired from `@strapi/core` when the OTLP metrics SDK initializes.
 * @internal Not part of the supported public API — only called from core observability bootstrap.
 */
export function setAdminPermissionsPhaseMetricsRecorder(
  recorder: PhaseMetricsRecorder | undefined
): void {
  phaseMetricsRecorder = recorder;
}

const isTracingConfigEnabled = (strapi: AdminPermissionsObservabilityStrapi): boolean =>
  strapi.config.get('server.observability.tracing.enabled') === true;

async function runWithOptionalInternalSpan<T>(
  strapi: AdminPermissionsObservabilityStrapi | undefined,
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

  return tracer.startActiveSpan(
    spanName,
    { kind: SpanKind.INTERNAL },
    resolveRequestWorkParentContext(),
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
 * INTERNAL span when tracing is enabled; OTLP histogram via recorder registered by core
 * (`strapi.admin.permissions.phase.duration_ms`). Used by the admin permissions manager.
 */
export async function withAdminPermissionsSpan<T>(
  strapi: AdminPermissionsObservabilityStrapi | undefined,
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
      tracerName: ADMIN_PERMISSIONS_TRACER_NAME,
      spanName,
      attributes,
      emitMetric() {
        phaseMetricsRecorder?.(strapi, uid, spanName, performance.now() - startMs);
      },
    },
    fn
  );
}
