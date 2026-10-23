module.exports = ({ env }) => ({
  upload: {
    config: {
      // Narrow, unambiguous deny so the upload journey's "unsupported file type"
      // step has something real to reject — the default config allows every type.
      security: {
        deniedTypes: ['application/x-msdownload'],
      },
    },
  },
  // Only the enterprise-plugins e2e domain sets this path. The values below must match the mock
  // provider in tests/e2e/tests/enterprise-plugins/byok-mock-provider.ts.
  ...(env('STRAPI_BYOK_PLUGIN_PATH') && {
    byok: {
      enabled: true,
      resolve: env('STRAPI_BYOK_PLUGIN_PATH'),
      config: {
        connection: {
          apiKey: 'e2e-mock-provider-api-key',
          baseURL: 'http://127.0.0.1:8900/v1',
        },
        models: {
          translations: 'e2e-translations-model',
          mediaMetadata: 'e2e-media-metadata-model',
        },
      },
    },
  }),
});
