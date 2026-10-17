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

let mockProviderInstance: Record<string, unknown> | undefined;

jest.mock('@strapi/provider-upload-local', () => ({
  init() {
    global.strapi.config.set('middlewares', exampleMiddlewaresConfig);

    return (
      mockProviderInstance ?? {
        uploadStream: jest.fn(),
        upload: jest.fn(),
        delete: jest.fn(),
      }
    );
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

const mockStrapi = (uploadConfig: Record<string, unknown>, uploadPlugin: Record<string, unknown>) =>
  ({
    dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
    plugins: { upload: uploadPlugin },
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

  describe('provider methods', () => {
    test('a method the provider declares as undefined is not exposed as a function', async () => {
      const emitWarning = jest.spyOn(process, 'emitWarning').mockImplementation(() => {});
      global.strapi = mockStrapi({ provider: 'upload-only-with-undefined-stream' }, {});

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

  describe('provider wrapper', () => {
    const file = { name: 'a.png' } as any;
    const oldFile = { name: 'old.png' } as any;

    const registerWithProvider = async (
      instance: Record<string, unknown>,
      actionOptions: Record<string, unknown> = {}
    ) => {
      mockProviderInstance = instance;
      const uploadPlugin: Record<string, any> = {};
      global.strapi = mockStrapi({ provider: 'local', actionOptions }, uploadPlugin);

      await register({ strapi });

      return uploadPlugin.provider;
    };

    afterEach(() => {
      mockProviderInstance = undefined;
    });

    test('passes actionOptions as the default options of (file, options) methods', async () => {
      const upload = jest.fn();
      const uploadStream = jest.fn();
      const deleteFn = jest.fn();

      const provider = await registerWithProvider(
        { upload, uploadStream, delete: deleteFn },
        { upload: { ACL: null }, uploadStream: { ACL: 'x' }, delete: { d: 1 } }
      );

      await provider.upload(file);
      await provider.uploadStream(file);
      await provider.delete(file);
      await provider.upload(file, { custom: true });

      expect(upload).toHaveBeenNthCalledWith(1, file, { ACL: null });
      expect(uploadStream).toHaveBeenCalledWith(file, { ACL: 'x' });
      expect(deleteFn).toHaveBeenCalledWith(file, { d: 1 });
      expect(upload).toHaveBeenNthCalledWith(2, file, { custom: true });
    });

    test('passes actionOptions as the third argument of replace and replaceStream', async () => {
      const replace = jest.fn();
      const replaceStream = jest.fn();

      const provider = await registerWithProvider(
        { upload: jest.fn(), delete: jest.fn(), replace, replaceStream },
        { replace: { r: 1 }, replaceStream: { rs: 1 } }
      );

      await provider.replace(file, oldFile);
      await provider.replaceStream(file, oldFile);
      await provider.replace(file, oldFile, { custom: true });

      expect(replace).toHaveBeenNthCalledWith(1, file, oldFile, { r: 1 });
      expect(replaceStream).toHaveBeenCalledWith(file, oldFile, { rs: 1 });
      expect(replace).toHaveBeenNthCalledWith(2, file, oldFile, { custom: true });
    });

    test('keeps provider-specific methods and properties untouched', async () => {
      const providerConfig = { bucket: 'b' };
      const uploadIfMatch = jest.fn();

      const provider = await registerWithProvider(
        {
          upload: jest.fn(),
          delete: jest.fn(),
          getProviderConfig: () => providerConfig,
          uploadIfMatch,
          version: 2,
        },
        { uploadIfMatch: { shouldNotBeUsed: true } }
      );

      expect(provider.getProviderConfig()).toBe(providerConfig);
      expect(provider.version).toBe(2);

      await provider.uploadIfMatch(file, 'etag', { p: 1 });
      expect(uploadIfMatch).toHaveBeenCalledWith(file, 'etag', { p: 1 });
    });

    test('falls back on the base provider defaults', async () => {
      const provider = await registerWithProvider({ upload: jest.fn(), delete: jest.fn() });

      expect(await provider.isPrivate()).toBe(false);
      expect(await provider.getSignedUrl(file)).toBe(file);
    });
  });
});
