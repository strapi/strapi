import { metrics, type Counter, type Histogram } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import type { Core } from '@strapi/types';

import { setAdminPermissionsPhaseMetricsRecorder } from '@strapi/utils';

import type {
  PublicDatabaseQueryPerformancePayload,
  PublicRequestSummaryPayload,
} from '../performance/event-payloads';
import { PERFORMANCE_HUB_EVENT } from '../performance/hub-events';
import { mapDatabaseClientToDbSystem } from './opentelemetry-tracing-utils';

const SERVICE_NAME_ATTR = 'service.name';
const MAX_ATTR_LEN = 128;

type MetricsObsConfig = NonNullable<NonNullable<Core.Config.Server['observability']>['metrics']>;

let meterProvider: MeterProvider | null = null;
let requestDurationMs: Histogram | null = null;
let requestDbTotalMs: Histogram | null = null;
let dbSlowOrErrorCounter: Counter | null = null;
let contentApiPhaseDurationMs: Histogram | null = null;
let documentServiceOperationDurationMs: Histogram | null = null;
let adminPermissionsPhaseDurationMs: Histogram | null = null;

function clampAttr(value: string, max = MAX_ATTR_LEN): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

function isMetricsFeatureEnabled(strapi: Core.Strapi): boolean {
  return strapi.config.get('server.observability.metrics.enabled') === true;
}

function isOtlpConfigured(strapi: Core.Strapi): boolean {
  const otlp = strapi.config.get('server.observability.metrics.otlp') as
    | Partial<{ enabled: boolean; url: string }>
    | undefined;
  return otlp?.enabled === true && typeof otlp.url === 'string' && otlp.url.length > 0;
}

function recordRequestSummary(ev: PublicRequestSummaryPayload): void {
  if (!requestDurationMs || !requestDbTotalMs) {
    return;
  }
  const attrs = {
    'http.request.method': ev.method.toUpperCase(),
    'http.route': clampAttr(ev.route),
    'http.response.status_code': String(ev.statusCode),
  };
  requestDurationMs.record(ev.durationMs, attrs);
  requestDbTotalMs.record(ev.dbTotalMs, attrs);
}

function recordDbSlowOrError(ev: PublicDatabaseQueryPerformancePayload): void {
  if (!dbSlowOrErrorCounter) {
    return;
  }
  const kind = ev.type === 'query.slow' ? 'slow' : 'error';
  dbSlowOrErrorCounter.add(1, {
    'db.system': mapDatabaseClientToDbSystem(ev.dbClient),
    'strapi.db.event': kind,
    'db.operation.name': ev.queryType,
  });
}

/** Installs a global `MeterProvider` when metrics + OTLP are enabled. Call from provider `register`. */
export function registerOpenTelemetryPerformanceMetrics(strapi: Core.Strapi): void {
  if (!isMetricsFeatureEnabled(strapi)) {
    return;
  }

  if (!isOtlpConfigured(strapi)) {
    strapi.log.warn(
      '[observability.metrics] `server.observability.metrics.enabled` is true but OTLP is not enabled or `url` is missing; skipping metrics SDK init.'
    );
    return;
  }

  if (meterProvider) {
    strapi.log.warn(
      '[observability.metrics] OpenTelemetry meter provider already registered; skipping duplicate init.'
    );
    return;
  }

  const metricsCfg = strapi.config.get('server.observability.metrics') as
    | Partial<MetricsObsConfig>
    | undefined;
  const tracingCfg = strapi.config.get('server.observability.tracing') as
    | { serviceName?: string }
    | undefined;
  const serviceName = metricsCfg?.serviceName ?? tracingCfg?.serviceName ?? 'strapi';
  const otlp = metricsCfg?.otlp;

  const resource = new Resource({ [SERVICE_NAME_ATTR]: serviceName });
  const exporter = new OTLPMetricExporter({
    url: otlp!.url!,
    headers: otlp?.headers,
  });

  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 60_000,
  });

  meterProvider = new MeterProvider({
    resource,
    readers: [reader],
  });
  metrics.setGlobalMeterProvider(meterProvider);

  const meter = meterProvider.getMeter('strapi.performance', '1.0.0');
  requestDurationMs = meter.createHistogram('strapi.http.server.request.duration_ms', {
    unit: 'ms',
    description: 'HTTP request duration from Strapi performance hub summaries',
  });
  requestDbTotalMs = meter.createHistogram('strapi.http.server.request.db_total_ms', {
    unit: 'ms',
    description: 'Aggregated DB time per request from Strapi performance hub summaries',
  });
  dbSlowOrErrorCounter = meter.createCounter('strapi.db.slow_or_error.events', {
    description: 'Slow or failed database queries from `database.performance` hub events',
  });
  contentApiPhaseDurationMs = meter.createHistogram('strapi.content_api.phase.duration_ms', {
    unit: 'ms',
    description: 'Content API sanitize and validate phase duration',
  });
  documentServiceOperationDurationMs = meter.createHistogram(
    'strapi.document_service.operation.duration_ms',
    {
      unit: 'ms',
      description:
        'Document service operation duration (all strapi.documents(uid) repository calls — REST, admin, plugins)',
    }
  );
  adminPermissionsPhaseDurationMs = meter.createHistogram(
    'strapi.admin.permissions.phase.duration_ms',
    {
      unit: 'ms',
      description:
        'Admin permission sanitize/validate phase duration (permissions manager around admin API)',
    }
  );

  setAdminPermissionsPhaseMetricsRecorder((strapi, uid, phase, durationMs) => {
    recordAdminPermissionsPhaseDuration(strapi as Core.Strapi | undefined, uid, phase, durationMs);
  });
}

/** OTLP histogram emit from `withContentApiSpan` when metrics SDK is initialized. */
export function recordContentApiPhaseDuration(
  strapi: Core.Strapi | undefined,
  contentTypeUid: string | undefined,
  phase: string,
  durationMs: number
): void {
  if (!contentApiPhaseDurationMs || !strapi || !isMetricsFeatureEnabled(strapi)) {
    return;
  }
  const attrs: Record<string, string> = {
    'strapi.phase': clampAttr(phase),
  };
  if (contentTypeUid) {
    attrs['strapi.content_type.uid'] = clampAttr(contentTypeUid);
  }
  contentApiPhaseDurationMs.record(durationMs, attrs);
}

/** OTLP histogram emit from Core API document calls when metrics SDK is initialized. */
export function recordDocumentServiceOperationDuration(
  strapi: Core.Strapi | undefined,
  contentTypeUid: string | undefined,
  operation: string,
  durationMs: number
): void {
  if (!documentServiceOperationDurationMs || !strapi || !isMetricsFeatureEnabled(strapi)) {
    return;
  }
  const attrs: Record<string, string> = {
    'strapi.operation': clampAttr(operation),
  };
  if (contentTypeUid) {
    attrs['strapi.content_type.uid'] = clampAttr(contentTypeUid);
  }
  documentServiceOperationDurationMs.record(durationMs, attrs);
}

/** OTLP histogram emit from `withAdminPermissionsSpan` when metrics SDK is initialized. */
export function recordAdminPermissionsPhaseDuration(
  strapi: Core.Strapi | undefined,
  contentTypeUid: string | undefined,
  phase: string,
  durationMs: number
): void {
  if (!adminPermissionsPhaseDurationMs || !strapi || !isMetricsFeatureEnabled(strapi)) {
    return;
  }
  const attrs: Record<string, string> = {
    'strapi.phase': clampAttr(phase),
  };
  if (contentTypeUid) {
    attrs['strapi.content_type.uid'] = clampAttr(contentTypeUid);
  }
  adminPermissionsPhaseDurationMs.record(durationMs, attrs);
}

/** Subscribes to performance hub events. Call from provider `bootstrap`. */
export function attachPerformanceMetricsHubListeners(strapi: Core.Strapi): () => void {
  if (!meterProvider) {
    return () => {
      /* no-op */
    };
  }

  const subscriber = async (eventName: string, ...args: unknown[]) => {
    try {
      if (eventName === PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY) {
        recordRequestSummary(args[0] as PublicRequestSummaryPayload);
        return;
      }
      if (
        eventName === PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW ||
        eventName === PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR
      ) {
        recordDbSlowOrError(args[0] as PublicDatabaseQueryPerformancePayload);
      }
    } catch {
      /* fail-open */
    }
  };

  return strapi.eventHub.subscribe(subscriber);
}

export async function shutdownOpenTelemetryPerformanceMetrics(strapi: Core.Strapi): Promise<void> {
  if (!meterProvider) {
    return;
  }

  try {
    await meterProvider.shutdown();
  } catch (error) {
    strapi.log.warn(`[observability.metrics] Failed to shutdown meter provider cleanly: ${error}`);
  }

  setAdminPermissionsPhaseMetricsRecorder(undefined);

  meterProvider = null;
  requestDurationMs = null;
  requestDbTotalMs = null;
  dbSlowOrErrorCounter = null;
  contentApiPhaseDurationMs = null;
  documentServiceOperationDurationMs = null;
  adminPermissionsPhaseDurationMs = null;
}
