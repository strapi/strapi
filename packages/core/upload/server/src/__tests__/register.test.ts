import { join } from 'path';
import { Readable } from 'stream';

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
import createProviderService from '../services/provider';
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

// The upload service removes `file.buffer` once `upload` returns, so record it at call time.
const uploadedContents: string[] = [];
const uploadOnlyUpload = jest.fn(async (file: { buffer: Buffer }) => {
  uploadedContents.push(file.buffer.toString());
});

// Not resolvable as `@strapi/provider-upload-*`, so register loads it by its own name.
jest.mock(
  'upload-only-with-undefined-stream',
  () => ({
    init() {
      return {
        upload: uploadOnlyUpload,
        uploadStream: undefined,
        delete: jest.fn(),
      };
    },
  }),
  { virtual: true }
);

const createStrapiMock = (uploadConfig: unknown) =>
  ({
    dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
    plugins: { upload: {} },
    db: { migrations: { providers: { internal: { register: jest.fn() } } } },
    server: { app: { on: jest.fn() }, routes: jest.fn() },
    admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
    config: {
      get: jest.fn().mockReturnValue(uploadConfig),
      set: jest.fn(),
    },
    get: jest.fn().mockReturnValue({ add: jest.fn() }),
  } as any);

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

  describe('provider methods', () => {
    test('a method the provider declares as undefined is not exposed as a function', async () => {
      const emitWarning = jest.spyOn(process, 'emitWarning').mockImplementation(() => {});
      global.strapi = createStrapiMock({ provider: 'upload-only-with-undefined-stream' });

      await register({ strapi });

      // The upload service falls back on `upload` with a buffer instead of crashing.
      const file = {
        hash: 'file_hash',
        ext: '.png',
        mime: 'image/png',
        getStream: () => Readable.from([Buffer.from('content')]),
      } as any;
      await createProviderService({ strapi }).upload(file);

      expect(uploadOnlyUpload).toHaveBeenCalledTimes(1);
      expect(uploadedContents).toEqual(['content']);

      const provider = strapi.plugin('upload').provider;
      expect(provider.uploadStream).toBeUndefined();
      expect(provider.upload).toEqual(expect.any(Function));

      emitWarning.mockRestore();
    });
  });
});
