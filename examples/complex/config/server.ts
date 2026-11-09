import type { Core } from '@strapi/strapi';

const serverConfig = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  /**
   * Turns on Strapi's OpenTelemetry API instrumentation. Spans and metrics only leave the process
   * when an SDK is preloaded (see `examples/otel-local/README.md`); otherwise the API no-ops.
   */
  const observability = env.bool('STRAPI_OTEL_ENABLED', false)
    ? {
        tracing: { enabled: true },
        metrics: { enabled: true },
      }
    : undefined;

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
      keys: env.array('APP_KEYS', ['toBeModified1', 'toBeModified2']),
    },
    /** Demo: per-request DB rollups + performance.request.summary on the hub (feeds artifact + admin widget). */
    performance: {
      requestTrackingEnabled: env.bool('SERVER_PERF_REQUEST_TRACKING', true),
      requestSampleRate: Number.parseFloat(env('SERVER_PERF_REQUEST_SAMPLE_RATE', '1')) || 1,
      slowRequestMs: env.int('SERVER_PERF_SLOW_REQUEST_MS', 500),
    },
    /** Winston level (default `debug` so perf summary demo lines from `src/index.ts` are visible). */
    logger: {
      config: {
        level: env('STRAPI_APP_LOG_LEVEL', 'debug'),
      },
    },
    transfer: {
      remote: {
        enabled: true,
      },
    },
    ...(observability ? { observability } : {}),
  };
};

export default serverConfig;
