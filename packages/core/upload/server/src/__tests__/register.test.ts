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
        log: { warn: jest.fn() },
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
        log: { warn: jest.fn() },
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
        log: { warn: jest.fn() },
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
        log: { warn: jest.fn() },
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
          log: { warn: jest.fn() },
          get: jest.fn().mockReturnValue({ add: jest.fn() }),
        } as any;

        await expect(register({ strapi })).resolves.toBeUndefined();

        expect(sharp.cache).toHaveBeenCalledWith(false);
        expect(sharp.concurrency).toHaveBeenCalledWith(1);
      }
    });
  });

  describe('provider', () => {
    const createStrapi = (uploadConfig: Record<string, unknown>) => {
      const set = jest.fn();
      const warn = jest.fn();
      const plugin = {} as { provider?: unknown };

      global.strapi = {
        dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
        plugins: { upload: plugin },
        db: { migrations: { providers: { internal: { register: jest.fn() } } } },
        server: { app: { on: jest.fn() }, routes: jest.fn() },
        config: { get: jest.fn().mockReturnValueOnce(uploadConfig), set },
        log: { warn },
        get: jest.fn().mockReturnValue({ add: jest.fn() }),
      } as any;

      return { set, warn, plugin };
    };

    const createModule = () => {
      const upload = jest.fn();
      return {
        upload,
        module: {
          name: 'custom',
          init: jest.fn().mockReturnValue({ upload, uploadStream: jest.fn(), delete: jest.fn() }),
        },
      };
    };

    test('uses an imported provider module and stores its name in the config', async () => {
      const { module, upload } = createModule();
      const { set, warn, plugin } = createStrapi({
        provider: module,
        providerOptions: { foo: 'bar' },
      });

      await register({ strapi });

      expect(module.init).toHaveBeenCalledWith({ foo: 'bar' });
      expect(set).toHaveBeenCalledWith('plugin::upload.provider', 'custom');
      expect(warn).not.toHaveBeenCalled();

      await (plugin.provider as { upload: (file: unknown) => Promise<unknown> }).upload('file');
      expect(upload).toHaveBeenCalledWith('file', undefined);
    });

    test('unwraps a provider module imported with its namespace object', async () => {
      const { module } = createModule();
      const { set } = createStrapi({ provider: { default: module } });

      await register({ strapi });

      expect(module.init).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith('plugin::upload.provider', 'custom');
    });

    test('throws when an imported provider module has no name', async () => {
      const { module } = createModule();
      createStrapi({ provider: { init: module.init } });

      await expect(register({ strapi })).rejects.toThrow(/has no "name"/);
    });

    test('throws when the provider is neither a name nor a provider module', async () => {
      createStrapi({ provider: { foo: 'bar' } });

      await expect(register({ strapi })).rejects.toThrow(/is not a provider module/);
    });

    test('warns for the default local provider, which will be removed', async () => {
      const { set, warn } = createStrapi({ provider: 'Local' });

      await register({ strapi });

      expect(set).toHaveBeenCalledWith('plugin::upload.provider', 'local');
      expect(warn).toHaveBeenCalledWith(
        'The upload provider "local" is resolved by name, which will be removed in the next major. Add "@strapi/provider-upload-local" to your dependencies and import it as `provider` in config/plugins instead.'
      );
    });

    // Resolved relative to register.ts
    const fixture = (name: string) => `./__tests__/resources/${name}`;

    test('warns when a provider resolved by name has no name', async () => {
      const { set, warn } = createStrapi({ provider: fixture('unnamed-provider') });

      await register({ strapi });

      expect(set).toHaveBeenCalledWith('plugin::upload.provider', fixture('unnamed-provider'));
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('doesn\'t export a "name". Its package must add one')
      );
    });

    test('warns and keeps the configured name when a provider exports another name', async () => {
      const { set, warn } = createStrapi({ provider: fixture('renamed-provider') });

      await register({ strapi });

      expect(set).toHaveBeenCalledWith('plugin::upload.provider', fixture('renamed-provider'));
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('exports the name "other-name", but files store')
      );
    });

    test('warns when a provider is resolved by name', async () => {
      const { warn } = createStrapi({ provider: 'not-installed-provider' });

      await expect(register({ strapi })).rejects.toThrow(
        'Could not load upload provider "not-installed-provider".'
      );
      expect(warn).toHaveBeenCalledWith(
        'The upload provider "not-installed-provider" is resolved by name, which will be removed in the next major. Import the provider as `provider` in config/plugins instead.'
      );
    });
  });
});
