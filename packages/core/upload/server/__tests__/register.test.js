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

jest.mock('@strapi/provider-upload-local', () => ({
  init() {
    global.strapi.config.set('middlewares', exampleMiddlewaresConfig);

    return {
      uploadStream: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
    };
  },
}));

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  getService: () => ({
    contentManager: { entityManager: { addSignedFileUrlsToAdmin: jest.fn() } },
  }),
}));

describe('Upload plugin register function', () => {
  test('The upload plugin registers the /upload route', async () => {
    const registerRoute = jest.fn();

    global.strapi = {
      dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
      plugins: { upload: {} },
      server: { app: { on: jest.fn() }, routes: registerRoute },
      admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
      config: {
        get: jest.fn().mockReturnValueOnce({ provider: 'local' }),
        set: jest.fn(),
      },
    };

    await bootstrap({ strapi });

    expect(registerRoute).toHaveBeenCalledTimes(1);
  });

  test('Strapi config can programatically be extended by providers', async () => {
    const setConfig = jest.fn();

    global.strapi = {
      dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
      plugins: { upload: {} },
      server: { app: { on: jest.fn() }, routes: jest.fn() },
      admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
      config: {
        get: jest.fn().mockReturnValueOnce({ provider: 'local' }),
        set: setConfig,
      },
    };

    await bootstrap({ strapi });

    expect(setConfig).toHaveBeenCalledWith('middlewares', exampleMiddlewaresConfig);
  });
});
