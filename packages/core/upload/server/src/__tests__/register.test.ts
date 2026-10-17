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
import { errors } from '@strapi/utils';
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
  }) as any;

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

    test.each(['upload', 'uploadStream', 'delete', 'checkFileSize', 'getSignedUrl'])(
      '%s(file, options) defaults options to its actionOptions',
      async (name) => {
        const method = jest.fn().mockReturnValue('result');
        const instance = { upload: jest.fn(), delete: jest.fn(), [name]: method };

        const provider = await registerWithProvider(instance, {
          [name]: { fromConfig: true },
          other: { shouldNotBeUsed: true },
        });

        const result = provider[name](file);
        expect(result).toBeInstanceOf(Promise);
        await expect(result).resolves.toBe('result');
        expect(method).toHaveBeenLastCalledWith(file, { fromConfig: true });
        expect(method.mock.contexts[0]).toBe(instance);

        await provider[name](file, { custom: true });
        expect(method).toHaveBeenLastCalledWith(file, { custom: true });
      }
    );

    test.each(['replace', 'replaceStream'])(
      '%s(newFile, oldFile, options) defaults options to its actionOptions',
      async (name) => {
        const method = jest.fn().mockReturnValue('result');
        const instance = { upload: jest.fn(), delete: jest.fn(), [name]: method };

        const provider = await registerWithProvider(instance, { [name]: { fromConfig: true } });

        const result = provider[name](file, oldFile);
        expect(result).toBeInstanceOf(Promise);
        await expect(result).resolves.toBe('result');
        expect(method).toHaveBeenLastCalledWith(file, oldFile, { fromConfig: true });
        expect(method.mock.contexts[0]).toBe(instance);

        await provider[name](file, oldFile, { custom: true });
        expect(method).toHaveBeenLastCalledWith(file, oldFile, { custom: true });
      }
    );

    test('isPrivate() is called without arguments and resolves its value', async () => {
      const isPrivate = jest.fn().mockReturnValue(true);
      const instance = { upload: jest.fn(), delete: jest.fn(), isPrivate };

      const provider = await registerWithProvider(instance, { isPrivate: { ignored: true } });

      const result = provider.isPrivate();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(true);
      expect(isPrivate).toHaveBeenCalledWith();
      expect(isPrivate.mock.contexts[0]).toBe(instance);
    });

    test('a sync throw from a wrapped method becomes a rejection', async () => {
      const error = new Error('too large');
      const provider = await registerWithProvider({
        upload: jest.fn(),
        delete: jest.fn(),
        checkFileSize() {
          throw error;
        },
      });

      await expect(provider.checkFileSize(file, { sizeLimit: 1 })).rejects.toBe(error);
    });

    test('optional contract methods the provider does not implement stay undefined', async () => {
      const provider = await registerWithProvider({ uploadStream: jest.fn(), delete: jest.fn() });

      expect(provider.upload).toBeUndefined();
      expect(provider.replace).toBeUndefined();
      expect(provider.replaceStream).toBeUndefined();
    });

    test('keeps provider-specific methods and properties untouched', async () => {
      const providerConfig = { bucket: 'b' };
      const uploadIfMatch = jest.fn();
      const getProviderConfig = jest.fn().mockReturnValue(providerConfig);
      const instance = {
        upload: jest.fn(),
        delete: jest.fn(),
        getProviderConfig,
        uploadIfMatch,
        version: 2,
      };

      const provider = await registerWithProvider(instance, {
        uploadIfMatch: { shouldNotBeUsed: true },
      });

      expect(provider.getProviderConfig()).toBe(providerConfig);
      expect(getProviderConfig.mock.contexts[0]).toBe(instance);
      expect(provider.version).toBe(2);

      await provider.uploadIfMatch(file, 'etag');
      expect(uploadIfMatch).toHaveBeenCalledWith(file, 'etag');
      expect(uploadIfMatch.mock.contexts[0]).toBe(instance);
    });

    test('provider methods calling this.upload get the raw method, without actionOptions', async () => {
      const upload = jest.fn();
      const provider = await registerWithProvider(
        {
          upload,
          delete: jest.fn(),
          uploadTwice(this: { upload: (f: unknown) => unknown }, f: unknown) {
            return this.upload(f);
          },
        },
        { upload: { fromConfig: true } }
      );

      await provider.uploadTwice(file);

      expect(upload).toHaveBeenCalledWith(file);
    });

    describe('base provider defaults', () => {
      test('isPrivate returns false', async () => {
        const provider = await registerWithProvider({ upload: jest.fn(), delete: jest.fn() });

        expect(provider.isPrivate()).toBe(false);
      });

      test('getSignedUrl returns the file', async () => {
        const provider = await registerWithProvider({ upload: jest.fn(), delete: jest.fn() });

        expect(provider.getSignedUrl(file)).toBe(file);
      });

      test('checkFileSize throws only when the file exceeds sizeLimit', async () => {
        const provider = await registerWithProvider({ upload: jest.fn(), delete: jest.fn() });
        // file.size is in KB, sizeLimit in bytes
        const bigFile = { name: 'big.png', size: 2 } as any;

        expect(() => provider.checkFileSize(bigFile, { sizeLimit: 1000 })).toThrow(
          errors.PayloadTooLargeError
        );
        expect(() => provider.checkFileSize(bigFile, { sizeLimit: 4000 })).not.toThrow();
        expect(() => provider.checkFileSize(bigFile, { sizeLimit: 0 })).not.toThrow();
      });

      test('extend adds properties to the provider', async () => {
        const provider = await registerWithProvider({ upload: jest.fn(), delete: jest.fn() });
        const extra = jest.fn();

        provider.extend({ extra });

        expect(provider.extra).toBe(extra);
      });
    });
  });
});
