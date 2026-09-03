'use strict';

module.exports = ({ env }) => ({
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',

      defaultLimit: 25,
      maxLimit: 100,

      apolloServer: {
        tracing: true,
      },

      v4CompatibilityMode: true,
    },
  },
  documentation: {
    config: {
      info: {
        version: '1.0.0',
      },
    },
  },
  myplugin: {
    enabled: true,
    resolve: `./src/plugins/local-plugin`, // From the root of the project
    config: {
      testConf: 3,
    },
  },
  // NOTE: set enabled:true to test with a pre-built plugin. Make sure to run yarn build in the plugin folder first
  todo: {
    enabled: false,
    resolve: `../plugins/todo-example`, // From the /examples/plugins folder
  },
  'ai-byok': {
    enabled: true,
    resolve: '../../node_modules/@strapi-enterprise/plugin-ai-byok',
    config: {
      enabled: env.bool('STRAPI_AI_BYOK_ENABLED', false),
      connection: {
        apiKey: env('STRAPI_AI_PROVIDER_API_KEY'),
        baseURL: env('STRAPI_AI_PROVIDER_BASE_URL', 'https://api.openai.com/v1'),
      },
      models: { translations: env('STRAPI_AI_TRANSLATIONS_MODEL', 'gpt-4.1-mini') },
    },
  },
});
