import { join } from 'path';

jest.mock('sharp', () => {
  return {
    __esModule: true,
    default: Object.assign(jest.fn(), {
      cache: jest.fn(),
      concurrency: jest.fn(),
    }),
  };
});

/* eslint-disable import/first -- mock runs before `sharp` import */
import sharp from 'sharp';
import { register } from '../register';
/* eslint-enable import/first */

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

describe('Upload plugin register', () => {
  describe('routes and provider middlewares', () => {
    test('The upload plugin registers the /upload route', async () => {
      const registerRoute = jest.fn();

      global.strapi = {
        dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
        plugins: { upload: {} },
        db: { migrations: { providers: { internal: { register: jest.fn() } } } },
        server: { app: { on: jest.fn() }, routes: registerRoute },
        admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
        config: {
          get: jest.fn().mockReturnValueOnce({ provider: 'local' }),
          set: jest.fn(),
        },
        get: jest.fn().mockReturnValue({ add: jest.fn() }),
      } as any;

      await register({ strapi });

      expect(registerRoute).toHaveBeenCalledTimes(1);
    });

    test('Strapi config can programatically be extended by providers', async () => {
      const setConfig = jest.fn();

      global.strapi = {
        dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
        plugins: { upload: {} },
        db: { migrations: { providers: { internal: { register: jest.fn() } } } },
        server: { app: { on: jest.fn() }, routes: jest.fn() },
        admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
        config: {
          get: jest.fn().mockReturnValueOnce({ provider: 'local' }),
          set: setConfig,
        },
        get: jest.fn().mockReturnValue({ add: jest.fn() }),
      } as any;

      await register({ strapi });

      expect(setConfig).toHaveBeenCalledWith('middlewares', exampleMiddlewaresConfig);
    });
  });

  describe('sharp', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('uses sharp.cache false and sharp.concurrency 1 from defaults', async () => {
      const registerRoute = jest.fn();

      global.strapi = {
        dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
        plugins: { upload: {} },
        db: { migrations: { providers: { internal: { register: jest.fn() } } } },
        server: { app: { on: jest.fn() }, routes: registerRoute },
        admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
        config: {
          get: jest.fn().mockReturnValue({ provider: 'local' }),
          set: jest.fn(),
        },
        get: jest.fn().mockReturnValue({ add: jest.fn() }),
      } as any;

      await register({ strapi });

      expect(sharp.cache).toHaveBeenCalledWith(false);
      expect(sharp.concurrency).toHaveBeenCalledWith(1);
    });

    test('forwards plugin::upload sharp.cache and sharp.concurrency to sharp', async () => {
      const registerRoute = jest.fn();

      global.strapi = {
        dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
        plugins: { upload: {} },
        db: { migrations: { providers: { internal: { register: jest.fn() } } } },
        server: { app: { on: jest.fn() }, routes: registerRoute },
        admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
        config: {
          get: jest
            .fn()
            .mockReturnValue({ provider: 'local', sharp: { cache: true, concurrency: 4 } }),
          set: jest.fn(),
        },
        get: jest.fn().mockReturnValue({ add: jest.fn() }),
      } as any;

      await register({ strapi });

      expect(sharp.cache).toHaveBeenCalledWith(true);
      expect(sharp.concurrency).toHaveBeenCalledWith(4);
    });
  });

  describe('base provider checkFileSize', () => {
    test('puts the code and the limit in the error details', async () => {
      const plugin: { provider?: any } = {};

      global.strapi = {
        dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
        plugins: { upload: plugin },
        db: { migrations: { providers: { internal: { register: jest.fn() } } } },
        server: { app: { on: jest.fn() }, routes: jest.fn() },
        admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
        config: {
          get: jest.fn().mockReturnValue({ provider: 'local' }),
          set: jest.fn(),
        },
        get: jest.fn().mockReturnValue({ add: jest.fn() }),
      } as any;

      await register({ strapi });

      expect(() =>
        plugin.provider.checkFileSize(
          { originalFilename: 'big.png', size: 2000 },
          { sizeLimit: 1000000 }
        )
      ).toThrow(
        expect.objectContaining({
          name: 'PayloadTooLargeError',
          message: 'big.png exceeds size limit of 1 MB.',
          details: { code: 'SizeLimitExceeded', limit: 1000000 },
        })
      );
    });
  });

  describe('size limit mismatch warning', () => {
    test('warns at register when sizeLimit is higher than the body parser limit', async () => {
      const warn = jest.fn();
      const configByPath: Record<string, unknown> = {
        'plugin::upload': { provider: 'local', sizeLimit: 500 * 1000 * 1000 },
        middlewares: [
          { name: 'strapi::body', config: { formidable: { maxFileSize: 250 * 1000 * 1000 } } },
        ],
      };

      global.strapi = {
        dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
        plugins: { upload: {} },
        db: { migrations: { providers: { internal: { register: jest.fn() } } } },
        server: { app: { on: jest.fn() }, routes: jest.fn() },
        admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
        config: {
          get: jest.fn((path: string) => configByPath[path]),
          set: jest.fn(),
        },
        log: { warn },
        get: jest.fn().mockReturnValue({ add: jest.fn() }),
      } as any;

      await register({ strapi });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('upload.config.sizeLimit is 500 MB');
    });
  });

  describe('plugin::upload config', () => {
    test('null/undefined plugin::upload: register runs, sharp cache and concurrency use defaults', async () => {
      for (const uploadFromConfig of [null, undefined]) {
        const registerRoute = jest.fn();
        (sharp.cache as jest.Mock).mockClear();
        (sharp.concurrency as jest.Mock).mockClear();

        global.strapi = {
          dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
          plugins: { upload: {} },
          db: { migrations: { providers: { internal: { register: jest.fn() } } } },
          server: { app: { on: jest.fn() }, routes: registerRoute },
          admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
          config: {
            get: jest.fn().mockReturnValue(uploadFromConfig as any),
            set: jest.fn(),
          },
          get: jest.fn().mockReturnValue({ add: jest.fn() }),
        } as any;

        await expect(register({ strapi })).resolves.toBeUndefined();

        expect(sharp.cache).toHaveBeenCalledWith(false);
        expect(sharp.concurrency).toHaveBeenCalledWith(1);
      }
    });
  });
});
