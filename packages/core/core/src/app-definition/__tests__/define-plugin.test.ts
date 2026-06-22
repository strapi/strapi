import { definePlugin } from '../define-plugin';
import { isDefinedPlugin } from '../brand';
import { normalizePluginsInput } from '../plugins';
import type { DefinePluginInput } from '../types';

const usersPermissions = { register() {} };

const base: DefinePluginInput = {
  name: 'users-permissions',
  plugin: usersPermissions as never,
};

describe('definePlugin', () => {
  it('brands the definition and carries its canonical name', () => {
    const defined = definePlugin(base);

    expect(isDefinedPlugin(defined)).toBe(true);
    expect(defined.name).toBe('users-permissions');
    expect(defined.plugin).toBe(usersPermissions);
  });

  it('preserves enabled/config/resolve options', () => {
    const defined = definePlugin({
      ...base,
      enabled: false,
      config: { a: 1 },
      resolve: '@strapi/plugin-users-permissions',
    });

    expect(defined).toMatchObject({
      enabled: false,
      config: { a: 1 },
      resolve: '@strapi/plugin-users-permissions',
    });
  });

  it('accepts a factory module', () => {
    const factory = () => usersPermissions;
    expect(() => definePlugin({ name: 'i18n', plugin: factory as never })).not.toThrow();
  });

  it.each([
    [{ ...base, name: undefined }, /name/],
    [{ ...base, name: '' }, /name/],
    [{ ...base, name: 'Users-Permissions' }, /kebab-case/],
    [{ ...base, plugin: undefined }, /plugin/],
    [{ ...base, plugin: 42 }, /plugin/],
  ])('throws a clear error for invalid input %#', (input, matcher) => {
    expect(() => definePlugin(input as DefinePluginInput)).toThrow(matcher);
  });

  it('rejects a non-object input', () => {
    // @ts-expect-error testing runtime guard
    expect(() => definePlugin(42)).toThrow(TypeError);
  });
});

describe('normalizePluginsInput', () => {
  it('returns a name-keyed map unchanged', () => {
    const map = { 'users-permissions': usersPermissions as never };
    expect(normalizePluginsInput(map)).toBe(map);
  });

  it('keys an array of definePlugin results by their name', () => {
    const map = normalizePluginsInput([
      definePlugin({ name: 'users-permissions', plugin: usersPermissions as never }),
      definePlugin({
        name: 'upload',
        plugin: { register() {} } as never,
        resolve: '@strapi/upload',
      }),
    ]);

    expect(Object.keys(map).sort()).toEqual(['upload', 'users-permissions']);
    expect(map.upload).toMatchObject({ resolve: '@strapi/upload' });
  });

  it('throws on a non-definePlugin array entry', () => {
    expect(() => normalizePluginsInput([usersPermissions as never])).toThrow(/definePlugin/);
  });

  it('throws on a duplicate name in the array', () => {
    expect(() =>
      normalizePluginsInput([
        definePlugin({ name: 'i18n', plugin: usersPermissions as never }),
        definePlugin({ name: 'i18n', plugin: usersPermissions as never }),
      ])
    ).toThrow(/Duplicate plugin "i18n"/);
  });
});
