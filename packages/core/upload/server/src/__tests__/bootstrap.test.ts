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

const createStrapiMock = ({
  setStore = jest.fn(() => {}),
  registerMany = jest.fn(() => {}),
  isAvailable = false,
  isStrapiManagedAiEnabled = false,
  hasProvider = jest.fn(() => false),
  registerStrapiManagedProvider = jest.fn(),
} = {}) =>
  ({
    get(name: string) {
      switch (name) {
        case 'webhookStore':
          return {
            addAllowedEvent: jest.fn(),
          };
        default:
          return null;
      }
    },
    dirs: {
      dist: { root: process.cwd() },
      app: { root: process.cwd() },
      static: { public: join(process.cwd(), 'public') },
    },
    admin: {
      services: { permission: { actionProvider: { registerMany } } },
    },
    ai: {
      admin: {
        isEnabled: () => false,
        isAvailable: () => isAvailable,
        isStrapiManagedAiEnabled: () => isStrapiManagedAiEnabled,
      },
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
            signFileUrlsOnDocumentService: jest.fn(),
          },
          aiMetadataProvider: {
            hasProvider,
            registerStrapiManagedProvider,
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
  }) as any;

describe('Upload plugin bootstrap function', () => {
  test('Sets default config if it does not exist', async () => {
    const setStore = jest.fn(() => {});

    global.strapi = createStrapiMock({ setStore });

    await bootstrap({ strapi });

    expect(setStore).toHaveBeenCalledWith({
      value: {
        aiMetadata: true,
        autoOrientation: false,
        sizeOptimization: true,
        responsiveDimensions: true,
      },
    });
  });

  test('registers the Strapi-managed AI metadata provider', async () => {
    const registerStrapiManagedProvider = jest.fn();

    global.strapi = createStrapiMock({
      isAvailable: true,
      isStrapiManagedAiEnabled: true,
      registerStrapiManagedProvider,
    });

    await bootstrap({ strapi });

    expect(registerStrapiManagedProvider).toHaveBeenCalledTimes(1);
  });

  test('does not register the Strapi-managed provider when AI is not available', async () => {
    const registerStrapiManagedProvider = jest.fn();

    global.strapi = createStrapiMock({
      isAvailable: false,
      isStrapiManagedAiEnabled: true,
      registerStrapiManagedProvider,
    });

    await bootstrap({ strapi });

    expect(registerStrapiManagedProvider).not.toHaveBeenCalled();
  });

  test('does not register the Strapi-managed provider without the cms-ai feature', async () => {
    const registerStrapiManagedProvider = jest.fn();

    global.strapi = createStrapiMock({
      isAvailable: true,
      isStrapiManagedAiEnabled: false,
      registerStrapiManagedProvider,
    });

    await bootstrap({ strapi });

    expect(registerStrapiManagedProvider).not.toHaveBeenCalled();
  });

  test('leaves a custom provider in place', async () => {
    const registerStrapiManagedProvider = jest.fn();

    global.strapi = createStrapiMock({
      isAvailable: true,
      isStrapiManagedAiEnabled: true,
      hasProvider: jest.fn(() => true),
      registerStrapiManagedProvider,
    });

    await bootstrap({ strapi });

    expect(registerStrapiManagedProvider).not.toHaveBeenCalled();
  });
});
