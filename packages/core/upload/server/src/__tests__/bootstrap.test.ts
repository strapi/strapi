import { join } from 'path';

import { bootstrap } from '../bootstrap';

jest.mock('@strapi/provider-upload-local', () => ({
  init() {
    return {
      uploadStream: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
    };
  },
}));

describe('Upload plugin bootstrap function', () => {
  test('Sets default config if it does not exist', async () => {
    const setStore = jest.fn(() => {});
    const registerMany = jest.fn(() => {});

    global.strapi = {
      dirs: {
        dist: { root: process.cwd() },
        app: { root: process.cwd() },
        static: { public: join(process.cwd(), 'public') },
      },
      admin: {
        services: { permission: { actionProvider: { registerMany } } },
      },
      log: {
        error() {},
      },
      config: {
        get: jest.fn().mockReturnValueOnce({ provider: 'local' }),
        paths: {},
        info: {
          dependencies: {},
        },
      },
      plugins: {
        upload: {
          services: {
            metrics: {
              sendUploadPluginMetrics() {},
            },
            weeklyMetrics: {
              registerCron() {},
            },
            extensions: {
              contentManager: { entityManager: { addSignedFileUrlsToAdmin: jest.fn() } },
            },
          },
        },
      },
      plugin() {
        return {};
      },
      service: () => ({
        registerErrorMiddleware: jest.fn(),
      }),
      store() {
        return {
          get() {
            return null;
          },
          set: setStore,
        };
      },
      webhookStore: {
        addAllowedEvent: jest.fn(),
      },
    } as any;

    await bootstrap({ strapi });

    expect(setStore).toHaveBeenCalledWith({
      value: {
        autoOrientation: false,
        sizeOptimization: true,
        responsiveDimensions: true,
      },
    });
  });
});
