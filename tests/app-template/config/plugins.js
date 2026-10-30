const path = require('path');

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
  // Only the enterprise-plugins e2e domain sets this path. The byok values below must match the
  // mock provider in tests/e2e/tests/enterprise-plugins/byok-mock-provider.ts.
  ...(env('STRAPI_ENTERPRISE_PLUGINS_PATH') && {
    byok: {
      enabled: true,
      resolve: path.join(
        env('STRAPI_ENTERPRISE_PLUGINS_PATH'),
        'node_modules/@strapi-enterprise/plugin-byok'
      ),
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
