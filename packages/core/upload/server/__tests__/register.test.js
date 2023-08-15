'use strict';

const { join } = require('path');
const bootstrap = require('../register');

const exampleMiddlewaresConfig = [
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https://exampledomain.global.strapi.io'],
          'media-src': ["'self'", 'data:', 'blob:', 'https://exampledomain.global.strapi.io'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
];

jest.mock('@strapi/strapi', () => {
  return new Proxy(
    {
      dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
      plugins: { upload: {} },
      plugin(name) {
        return this.plugins[name];
      },
      server: { app: { on: jest.fn() }, routes: jest.fn() },
      admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
      config: {
        get: jest.fn().mockReturnValue({ provider: 'local' }),
        set: jest.fn(),
      },
    },
    {
      get: (target, prop) => target[prop],
    }
  );
});

jest.mock('@strapi/provider-upload-local', () => ({
  init() {
    const strapi = require('@strapi/strapi');
    strapi.config.set('middlewares', exampleMiddlewaresConfig);

    return {
      uploadStream: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
    };
  },
}));

describe('Upload plugin register function', () => {
  let strapi;

  beforeEach(() => {
    strapi = require('@strapi/strapi');
  });

  test('The upload plugin registers the /upload route', async () => {
    await bootstrap();

    expect(strapi.server.routes).toHaveBeenCalledTimes(1);
  });

  test('Strapi config can programatically be extended by providers', async () => {
    await bootstrap();

    expect(strapi.config.set).toHaveBeenCalledWith('middlewares', exampleMiddlewaresConfig);
  });
});
