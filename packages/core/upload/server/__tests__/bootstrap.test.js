'use strict';

const bootstrap = require('../bootstrap');

jest.mock('@strapi/provider-upload-local', () => ({
  init() {
    return {
      uploadStream: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
    };
  },
}));

const setStore = jest.fn(() => {});

const metricsService = {
  sendUploadPluginMetrics() {},
};
const weeklyMetricsService = {
  registerCron() {},
};
const extensionsService = {
  contentManager: { entityManager: { addSignedFileUrlsToAdmin: jest.fn() } },
  core: { entityService: { addSignedFileUrlsToEntityService: jest.fn() } },
};

jest.mock('@strapi/strapi', () => {
  const strapiMock = {
    admin: {
      services: { permission: { actionProvider: { registerMany: jest.fn() } } },
    },
    config: {
      get: jest.fn().mockReturnValueOnce({ provider: 'local' }),
    },
    plugins: {
      upload: {
        service(name) {
          if (name === 'metrics') {
            return metricsService;
          }
          if (name === 'weeklyMetrics') {
            return weeklyMetricsService;
          }
          if (name === 'extensions') {
            return extensionsService;
          }
          return {};
        },
      },
    },
    plugin(name) {
      return this.plugins[name];
    },
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
  };

  return new Proxy(strapiMock, {
    get: (target, prop) => target[prop],
  });
});

describe('Upload plugin bootstrap function', () => {
  test('Sets default config if it does not exist', async () => {
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
