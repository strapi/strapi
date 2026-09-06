import { getEnabledPlugins } from '../plugins';
import * as files from '../files';
import * as dependencies from '../dependencies';

jest.mock('../files', () => {
  const actual = jest.requireActual('../files');
  return {
    __esModule: true,
    ...actual,
    loadFile: jest.fn(),
  };
});

jest.mock('../dependencies', () => {
  const actual = jest.requireActual('../dependencies');
  return {
    __esModule: true,
    ...actual,
    getModule: jest.fn(),
  };
});

const mockedLoadFile = files.loadFile as jest.MockedFunction<typeof files.loadFile>;
const mockedGetModule = dependencies.getModule as jest.MockedFunction<
  typeof dependencies.getModule
>;

const installedPluginPackage = (name: string) => ({
  name,
  version: '1.0.0',
  strapi: { kind: 'plugin', name },
});

interface ContextOptions {
  pluginsConfig?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  installedPackages?: Record<string, unknown>;
}

const buildContext = ({
  pluginsConfig = {},
  dependencies: deps = {},
  installedPackages = {},
}: ContextOptions = {}) => {
  mockedLoadFile.mockReset();
  // loadUserPluginsFile tries plugins.js / .mjs / .ts and returns the first hit
  mockedLoadFile.mockImplementation(async (filePath: string) =>
    filePath.endsWith('plugins.js') ? pluginsConfig : undefined
  );

  mockedGetModule.mockReset();
  mockedGetModule.mockImplementation(
    async (name: string) => (installedPackages[name] ?? null) as any
  );

  return {
    cwd: '/app',
    runtimeDir: '/app/.strapi/client',
    logger: {
      debug: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as any,
    strapi: {
      config: {
        get: jest.fn((key: string, def: unknown) => (key === 'info.dependencies' ? deps : def)),
      },
      dirs: { app: { config: '/app/config' } },
    } as any,
  };
};

describe('admin build getEnabledPlugins', () => {
  describe('installed (node_modules) plugins respect config/plugins enabled flag (#23269)', () => {
    const deps = { 'my-plugin': '1.0.0' };
    const installedPackages = { 'my-plugin': installedPluginPackage('my-plugin') };

    it('includes an installed plugin that has no config entry', async () => {
      const ctx = buildContext({ dependencies: deps, installedPackages });
      const plugins = await getEnabledPlugins(ctx);
      expect(Object.keys(plugins)).toContain('my-plugin');
    });

    it('excludes an installed plugin disabled via { enabled: false }', async () => {
      const ctx = buildContext({
        pluginsConfig: { 'my-plugin': { enabled: false } },
        dependencies: deps,
        installedPackages,
      });
      const plugins = await getEnabledPlugins(ctx);
      expect(Object.keys(plugins)).not.toContain('my-plugin');
    });

    it('excludes an installed plugin disabled via the boolean shorthand `false`', async () => {
      const ctx = buildContext({
        pluginsConfig: { 'my-plugin': false },
        dependencies: deps,
        installedPackages,
      });
      const plugins = await getEnabledPlugins(ctx);
      expect(Object.keys(plugins)).not.toContain('my-plugin');
    });

    it('includes an installed plugin enabled via { enabled: true }', async () => {
      const ctx = buildContext({
        pluginsConfig: { 'my-plugin': { enabled: true } },
        dependencies: deps,
        installedPackages,
      });
      const plugins = await getEnabledPlugins(ctx);
      expect(Object.keys(plugins)).toContain('my-plugin');
    });
  });

  describe('local { resolve } plugins match the server loader semantics', () => {
    it('excludes a local plugin declared with resolve but no explicit enabled', async () => {
      const ctx = buildContext({ pluginsConfig: { foo: { resolve: './src/plugins/foo' } } });
      const plugins = await getEnabledPlugins(ctx);
      expect(Object.keys(plugins)).not.toContain('foo');
    });

    it('excludes a local plugin with enabled: false', async () => {
      const ctx = buildContext({
        pluginsConfig: { foo: { enabled: false, resolve: './src/plugins/foo' } },
      });
      const plugins = await getEnabledPlugins(ctx);
      expect(Object.keys(plugins)).not.toContain('foo');
    });

    it('includes a local plugin with enabled: true', async () => {
      const ctx = buildContext({
        pluginsConfig: { foo: { enabled: true, resolve: './src/plugins/foo' } },
      });
      const plugins = await getEnabledPlugins(ctx);
      expect(Object.keys(plugins)).toContain('foo');
    });
  });
});
