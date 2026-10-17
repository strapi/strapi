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
