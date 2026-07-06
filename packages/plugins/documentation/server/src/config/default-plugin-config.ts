import type { PluginConfig } from '../types';

export const defaultConfig: PluginConfig = {
  openapi: '3.0.0',
  'x-strapi-config': {
    plugins: null,
    mutateDocumentation: null,
  },
  servers: [],
  externalDocs: {
    description: 'Find out more',
    url: 'https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html',
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          data: {
            oneOf: [
              { type: 'object' },
              { type: 'array', items: { type: 'object' } },
              { type: 'null' },
            ],
          },
          error: {
            type: 'object',
            properties: {
              status: {
                type: 'integer',
              },
              name: {
                type: 'string',
              },
              message: {
                type: 'string',
              },
              details: {
                type: 'object',
              },
            },
          },
        },
      },
    },
  },
};
