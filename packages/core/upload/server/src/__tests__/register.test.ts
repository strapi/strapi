import { join } from 'path';
import { register } from '../register';

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
    } as any;

    await register({ strapi });

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
    } as any;

    await register({ strapi });

    expect(setConfig).toHaveBeenCalledWith('middlewares', exampleMiddlewaresConfig);
  });
});
