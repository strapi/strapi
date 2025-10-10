import type { PluginConfig } from '../types';

export const defaultConfig: PluginConfig = {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'DOCUMENTATION',
    description: '',
    termsOfService: 'YOUR_TERMS_OF_SERVICE_URL',
    contact: {
      name: 'TEAM',
      email: 'contact-email@something.io',
      url: 'mywebsite.io',
    },
    license: {
      name: 'Apache 2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
    },
  },
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
            nullable: true,
            oneOf: [{ type: 'object' }, { type: 'array', items: { type: 'object' } }],
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
