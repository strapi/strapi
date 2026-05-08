const serverConfig = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS', ['toBeModified1', 'toBeModified2']),
  },
  /** Demo: per-request DB rollups + performance.request.summary on the hub. */
  performance: {
    requestSummaryEnabled: env.bool('SERVER_PERF_REQUEST_SUMMARY', true),
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
});

export default serverConfig;
