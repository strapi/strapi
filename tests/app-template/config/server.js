module.exports = ({ env }) => {
  const base = {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
      keys: env.array('APP_KEYS'),
    },
    webhooks: {
      populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    },
  };

  const perfArtifactPath = env('STRAPI_CI_PERF_ARTIFACT_PATH', '');
  if (!perfArtifactPath) {
    return base;
  }

  return {
    ...base,
    performance: {
      requestSummaryEnabled: true,
      requestSampleRate: Math.min(
        1,
        Math.max(0, Number.parseFloat(env('STRAPI_CI_PERF_REQUEST_SAMPLE_RATE', '1')) || 1)
      ),
      slowRequestMs: env.int('STRAPI_CI_PERF_SLOW_REQUEST_MS', 500),
      emitStageEvents: env.bool('STRAPI_CI_PERF_EMIT_STAGES', false),
    },
  };
};
