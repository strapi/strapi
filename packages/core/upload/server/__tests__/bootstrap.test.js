'use strict';

const { join } = require('path');

const bootstrap = require('../bootstrap');

describe('Upload plugin bootstrap function', () => {
  test('Sets default config if id does not exist', async () => {
    const setStore = jest.fn(() => {});
    const registerMany = jest.fn(() => {});

    global.strapi = {
      dirs: { root: process.cwd(), public: join(process.cwd(), 'public') },
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
        upload: {},
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
    };

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
