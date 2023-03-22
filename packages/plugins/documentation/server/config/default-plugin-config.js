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
};
