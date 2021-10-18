'use strict';

module.exports = {
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
    path: '/documentation',
    showGeneratedFiles: true,
    generateDefaultResponse: true,
    plugins: ['email', 'upload', 'users-permissions'],
  },
  servers: [
    {
      url: 'http://localhost:1337/api',
      description: 'Development server',
    },
    {
      url: 'YOUR_STAGING_SERVER',
      description: 'Staging server',
    },
    {
      url: 'YOUR_PRODUCTION_SERVER',
      description: 'Production server',
    },
  ],
  externalDocs: {
    description: 'Find out more',
    url: 'https://strapi.io/documentation/developer-docs/latest/getting-started/introduction.html',
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
