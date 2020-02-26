const bootstrap = require('../bootstrap');

describe('Upload plugin bootstrap function', () => {
  test('Sets default config if id does not exist', async () => {
    const setStore = jest.fn(() => {});

    const strapi = {
      config: {
        info: {
          dependencies: {},
        },
      },
      plugins: {
        upload: { config: {} },
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

    await bootstrap(strapi);

    expect(setStore).toHaveBeenCalledWith({
      value: {
        sizeOptimization: true,
        videoPreview: true,
        responsiveDimensions: true,
      },
    });
  });
});
