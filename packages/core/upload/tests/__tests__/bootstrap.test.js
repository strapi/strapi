'use strict';

const bootstrap = require('../../config/functions/bootstrap');

describe('Upload plugin bootstrap function', () => {
  test('Sets default config if id does not exist', async () => {
    const setStore = jest.fn(() => {});
    const registerMany = jest.fn(() => {});

    global.strapi = {
      dir: process.cwd(),
      admin: {
        services: { permission: { actionProvider: { registerMany } } },
      },
      log: {
        error() {},
      },
      config: {
        get: jest
          .fn()
          .mockReturnValueOnce({ provider: 'local' })
          .mockReturnValueOnce('public'),
        paths: {},
        info: {
          dependencies: {},
        },
      },
      plugins: {
        upload: {},
      },
      store() {
        return {
          get() {
            return null;
          },
          set: setStore,
        };
      },
    };

    await bootstrap();

    expect(setStore).toHaveBeenCalledWith({
      value: {
        autoOrientation: false,
        sizeOptimization: true,
        responsiveDimensions: true,
      },
    });
  });
});
