import { createRequire } from 'node:module';
import type { AppDefinition } from '@strapi/core';
import { fromDisk } from '@strapi/core';

import { getProgrammaticPlugins } from '../programmatic-plugins';

jest.mock('node:module', () => {
  const actual = jest.requireActual('node:module');
  return {
    ...actual,
    createRequire: jest.fn(),
  };
});

const mockedCreateRequire = createRequire as jest.MockedFunction<typeof createRequire>;

/**
 * A `require` whose `.resolve` only succeeds for the given set of specifiers,
 * mimicking which `<base>/strapi-admin` entries are installed.
 */
const requireResolvingOnly = (resolvable: string[]) => {
  const resolve = jest.fn((specifier: string) => {
    if (resolvable.includes(specifier)) {
      return specifier;
    }
    throw Object.assign(new Error(`Cannot find module '${specifier}'`), {
      code: 'MODULE_NOT_FOUND',
    });
  });

  return Object.assign(jest.fn(), { resolve }) as unknown as ReturnType<typeof createRequire>;
};

const app = (plugins: AppDefinition['plugins']): AppDefinition => ({ plugins }) as AppDefinition;

describe('getProgrammaticPlugins', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when there are no plugins (falls back to legacy discovery)', () => {
    mockedCreateRequire.mockReturnValue(requireResolvingOnly([]));
    expect(getProgrammaticPlugins({ app: app(undefined), cwd: '/app' })).toBeNull();
  });

  it('returns null when plugins is a fromDisk() source (legacy bridge)', () => {
    mockedCreateRequire.mockReturnValue(requireResolvingOnly([]));
    expect(getProgrammaticPlugins({ app: app(fromDisk('./')), cwd: '/app' })).toBeNull();
  });

  it('maps plugins to their resolvable strapi-admin package base', () => {
    mockedCreateRequire.mockReturnValue(
      requireResolvingOnly(['@strapi/content-manager/strapi-admin'])
    );

    const plugins = getProgrammaticPlugins({
      app: app({
        'content-manager': {
          plugin: { register() {} } as any,
          resolve: '@strapi/content-manager',
        },
      }),
      cwd: '/app',
    });

    expect(plugins).toEqual({
      'content-manager': {
        name: 'content-manager',
        importName: 'contentManager',
        type: 'module',
        modulePath: '@strapi/content-manager',
      },
    });
  });

  it('falls back to the @strapi/<name> convention when no resolve hint is given', () => {
    mockedCreateRequire.mockReturnValue(requireResolvingOnly(['@strapi/upload/strapi-admin']));

    const plugins = getProgrammaticPlugins({
      app: app({ upload: { register() {} } as any }),
      cwd: '/app',
    });

    expect(plugins?.upload?.modulePath).toBe('@strapi/upload');
  });

  it('skips plugins whose strapi-admin entry is not resolvable (server-only)', () => {
    mockedCreateRequire.mockReturnValue(requireResolvingOnly([]));

    const plugins = getProgrammaticPlugins({
      app: app({ email: { plugin: { register() {} } as any, resolve: '@strapi/email' } }),
      cwd: '/app',
    });

    expect(plugins).toEqual({});
  });

  it('omits disabled plugins', () => {
    mockedCreateRequire.mockReturnValue(requireResolvingOnly(['@strapi/i18n/strapi-admin']));

    const plugins = getProgrammaticPlugins({
      app: app({
        i18n: { plugin: { register() {} } as any, resolve: '@strapi/i18n', enabled: false },
      }),
      cwd: '/app',
    });

    expect(plugins).toEqual({});
  });
});
