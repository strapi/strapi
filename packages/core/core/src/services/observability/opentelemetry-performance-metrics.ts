import { metrics, type Counter, type Histogram } from '@opentelemetry/api';
import type { Core } from '@strapi/types';

import { setAdminPermissionsPhaseMetricsRecorder } from '@strapi/utils';

import type {
  PublicDatabaseQueryPerformancePayload,
  PublicRequestSummaryPayload,
} from '../performance/event-payloads';
import { PERFORMANCE_HUB_EVENT } from '../performance/hub-events';
import { mapDatabaseClientToDbSystem } from './opentelemetry-tracing-utils';

const MAX_ATTR_LEN = 128;

let metricsRegistered = false;
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

function recordStrapiLabeledHistogram(
  histogram: Histogram | null,
  strapi: Core.Strapi | undefined,
  primaryAttribute: { name: string; value: string },
  contentTypeUid: string | undefined,
  durationMs: number
): void {
  if (!histogram || !strapi || !isMetricsFeatureEnabled(strapi)) {
    return;
  }
  const attrs: Record<string, string> = {
    [primaryAttribute.name]: clampAttr(primaryAttribute.value),
  };
  if (contentTypeUid) {
    attrs['strapi.content_type.uid'] = clampAttr(contentTypeUid);
  }
  histogram.record(durationMs, attrs);
}

/**
 * Creates Strapi instruments on the global OpenTelemetry API meter. The app owns the
 * `MeterProvider` and exporter, and must register them before Strapi starts. Without one,
 * the API returns no-op instruments.
 */
export function registerOpenTelemetryPerformanceMetrics(strapi: Core.Strapi): void {
  if (!isMetricsFeatureEnabled(strapi) || metricsRegistered) {
    return;
  }

  metricsRegistered = true;
  const meter = metrics.getMeter('strapi.performance', '1.0.0');
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

/** Histogram emit from `withContentApiSpan` when metrics are enabled. */
export function recordContentApiPhaseDuration(
  strapi: Core.Strapi | undefined,
  contentTypeUid: string | undefined,
  phase: string,
  durationMs: number
): void {
  recordStrapiLabeledHistogram(
    contentApiPhaseDurationMs,
    strapi,
    { name: 'strapi.phase', value: phase },
    contentTypeUid,
    durationMs
  );
}

/** Histogram emit from document service calls when metrics are enabled. */
export function recordDocumentServiceOperationDuration(
  strapi: Core.Strapi | undefined,
  contentTypeUid: string | undefined,
  operation: string,
  durationMs: number
): void {
  recordStrapiLabeledHistogram(
    documentServiceOperationDurationMs,
    strapi,
    { name: 'strapi.operation', value: operation },
    contentTypeUid,
    durationMs
  );
}

/** Histogram emit from `withAdminPermissionsSpan` when metrics are enabled. */
export function recordAdminPermissionsPhaseDuration(
  strapi: Core.Strapi | undefined,
  contentTypeUid: string | undefined,
  phase: string,
  durationMs: number
): void {
  recordStrapiLabeledHistogram(
    adminPermissionsPhaseDurationMs,
    strapi,
    { name: 'strapi.phase', value: phase },
    contentTypeUid,
    durationMs
  );
}

/** Listens to performance hub events. Call from provider `bootstrap`. */
export function attachPerformanceMetricsHubListeners(strapi: Core.Strapi): () => void {
  if (!metricsRegistered) {
    return () => {
      /* no-op */
    };
  }

  const unsubscribes = [
    strapi.eventHub.on(PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY, async (event) => {
      try {
        recordRequestSummary(event as PublicRequestSummaryPayload);
      } catch {
        /* fail-open */
      }
    }),
    ...[PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR].map(
      (eventName) =>
        strapi.eventHub.on(eventName, async (event) => {
          try {
            recordDbSlowOrError(event as PublicDatabaseQueryPerformancePayload);
          } catch {
            /* fail-open */
          }
        })
    ),
  ];

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

export function shutdownOpenTelemetryPerformanceMetrics(): void {
  if (!metricsRegistered) {
    return;
  }

  setAdminPermissionsPhaseMetricsRecorder(undefined);

  metricsRegistered = false;
  requestDurationMs = null;
  requestDbTotalMs = null;
  dbSlowOrErrorCounter = null;
  contentApiPhaseDurationMs = null;
  documentServiceOperationDurationMs = null;
  adminPermissionsPhaseDurationMs = null;
}
