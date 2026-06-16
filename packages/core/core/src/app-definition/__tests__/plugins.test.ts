import {
  unwrapPluginEntry,
  normalizePluginModule,
  loadProgrammaticPlugins,
  getAdminPluginResolutions,
} from '../plugins';

const makeStrapi = () => {
  const pluginsAdd = jest.fn();
  const configSet = jest.fn();
  return {
    strapi: {
      config: { set: configSet },
      get: jest.fn((name: string) => (name === 'plugins' ? { add: pluginsAdd } : undefined)),
    } as any,
    pluginsAdd,
    configSet,
  };
};

describe('unwrapPluginEntry', () => {
  it('unwraps a bare module', () => {
    const mod = { register() {} };
    expect(unwrapPluginEntry(mod as any)).toEqual({
      module: mod,
      enabled: true,
      userConfig: {},
    });
  });

  it('unwraps a configured entry', () => {
    const mod = { register() {} };
    expect(unwrapPluginEntry({ plugin: mod as any, enabled: false, config: { a: 1 } })).toEqual({
      module: mod,
      enabled: false,
      userConfig: { a: 1 },
      resolve: undefined,
    });
  });

  it('surfaces the admin-build `resolve` hint', () => {
    const mod = { register() {} };
    expect(unwrapPluginEntry({ plugin: mod as any, resolve: '@strapi/upload' })).toMatchObject({
      module: mod,
      enabled: true,
      resolve: '@strapi/upload',
    });
  });
});

describe('getAdminPluginResolutions', () => {
  it('returns name + resolve hint for enabled plugins, dropping disabled ones', () => {
    const result = getAdminPluginResolutions({
      'content-manager': { plugin: { register() {} } as any, resolve: '@strapi/content-manager' },
      'users-permissions': { register() {} } as any,
      i18n: { plugin: { register() {} } as any, enabled: false },
    });

    expect(result).toEqual([
      { name: 'content-manager', resolve: '@strapi/content-manager' },
      { name: 'users-permissions', resolve: undefined },
    ]);
  });
});

describe('normalizePluginModule', () => {
  it('returns an object module as-is', () => {
    const mod = { register() {} };
    expect(normalizePluginModule(mod as any)).toBe(mod);
  });

  it('calls a factory module with { env }', () => {
    const result = { register() {} };
    const factory = jest.fn(() => result);
    expect(normalizePluginModule(factory as any)).toBe(result);
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ env: expect.anything() }));
  });

  it('throws when the module does not resolve to an object', () => {
    expect(() => normalizePluginModule((() => null) as any)).toThrow();
  });
});

describe('loadProgrammaticPlugins', () => {
  it('registers enabled plugins keyed by canonical name', () => {
    const { strapi, pluginsAdd, configSet } = makeStrapi();
    const validator = jest.fn();

    loadProgrammaticPlugins(strapi, {
      'users-permissions': { register() {} } as any,
      upload: { plugin: { config: { default: { provider: 'x' }, validator } } as any },
    });

    const registered = pluginsAdd.mock.calls.map((c) => c[0]);
    expect(registered).toEqual(['users-permissions', 'upload']);
    expect(validator).toHaveBeenCalledWith({ provider: 'x' });
    expect(configSet).toHaveBeenCalledWith(
      'enabledPlugins',
      expect.objectContaining({ 'users-permissions': expect.any(Object) })
    );
  });

  it('skips disabled plugins', () => {
    const { strapi, pluginsAdd } = makeStrapi();
    loadProgrammaticPlugins(strapi, {
      i18n: { plugin: { register() {} } as any, enabled: false },
    });
    expect(pluginsAdd).not.toHaveBeenCalled();
  });

  it('merges user config over plugin defaults', () => {
    const { strapi, pluginsAdd } = makeStrapi();
    loadProgrammaticPlugins(strapi, {
      upload: { plugin: { config: { default: { a: 1, b: 2 } } } as any, config: { b: 9 } },
    });
    const registered = pluginsAdd.mock.calls[0][1];
    expect(registered.config).toEqual({ a: 1, b: 9 });
  });

  it('throws a clear error when the plugin config validator fails', () => {
    const { strapi } = makeStrapi();
    expect(() =>
      loadProgrammaticPlugins(strapi, {
        bad: {
          plugin: {
            config: {
              default: {},
              validator() {
                throw new Error('nope');
              },
            },
          } as any,
        },
      })
    ).toThrow(/Error regarding bad config: nope/);
  });
});
