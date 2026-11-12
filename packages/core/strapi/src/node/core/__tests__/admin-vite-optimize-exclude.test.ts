import {
  ADMIN_VITE_OPTIMIZE_DEPS_EXCLUDE_ALLOWLIST,
  collectAdminOptimizeDepsExclude,
  getPluginPackageName,
  hasReactPeerDependency,
  isEligibleForOptimizeDepsExclude,
  isEsmPackage,
  packageOptsIntoOptimizeDepsExclude,
  shipsPreBuiltDist,
  shouldExcludeFromOptimizeDeps,
} from '../admin-vite-optimize-exclude';
import {
  ADMIN_VITE_ALIAS_MODULES,
  ADMIN_VITE_SINGLETON_MODULES,
} from '../admin-vite-alias-modules';
import { getModule } from '../dependencies';
import type { PluginMeta } from '../plugins';

jest.mock('../dependencies', () => ({
  getModule: jest.fn(),
}));

jest.mock('read-pkg-up', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const readPkgUp = jest.requireMock('read-pkg-up').default as jest.Mock;

const PINNED_OPTIMIZE_MODULES = [
  ...ADMIN_VITE_ALIAS_MODULES,
  ...ADMIN_VITE_SINGLETON_MODULES,
  '@strapi/strapi',
] as const;

const preBuiltReactPeerPackage = (name: string, extras: Record<string, unknown> = {}) => ({
  name,
  type: 'module',
  module: './dist/index.js',
  files: ['dist'],
  peerDependencies: {
    react: '^18.0.0',
    'react-dom': '^18.0.0',
  },
  ...extras,
});

const strapiDesignExtendedLike = {
  name: 'strapi-design-extended',
  type: 'module',
  files: ['dist'],
  module: './dist/index.js',
  exports: {
    '.': {
      import: './dist/index.js',
    },
  },
  peerDependencies: {
    react: '^18.0.0',
    'react-dom': '^18.0.0',
    '@strapi/design-system': '^2.2.0',
  },
};

/** CKEditor-class: matches the UI-kit shape but must not auto-exclude (#27136). */
const ckeditorPluginLike = preBuiltReactPeerPackage('@_sh/strapi-plugin-ckeditor', {
  dependencies: {
    ckeditor5: '^43.0.0',
    yup: '^0.32.0',
    fuzzysort: '^3.0.0',
  },
});

describe('admin vite optimize exclude heuristics', () => {
  it('matches pre-built ESM libraries with React peers', () => {
    expect(shouldExcludeFromOptimizeDeps(strapiDesignExtendedLike)).toBe(true);
  });

  it('does not match CommonJS libraries with React peers', () => {
    expect(
      shouldExcludeFromOptimizeDeps({
        name: 'formik',
        main: 'dist/formik.cjs.production.min.js',
        peerDependencies: {
          react: '>=16.8.0',
        },
      })
    ).toBe(false);
  });

  it('does not match ESM React peers that ship source instead of dist', () => {
    expect(
      shouldExcludeFromOptimizeDeps({
        name: 'react-intl',
        type: 'module',
        module: './lib/index.js',
        peerDependencies: {
          react: '^18.0.0',
        },
      })
    ).toBe(false);
  });

  it('does not match packages without React peers', () => {
    expect(
      shouldExcludeFromOptimizeDeps({
        name: 'lodash',
        type: 'module',
        module: './dist/index.js',
        files: ['dist'],
      })
    ).toBe(false);
  });

  it('extracts scoped plugin package names from admin entry paths', () => {
    expect(getPluginPackageName('@org/my-plugin/strapi-admin')).toBe('@org/my-plugin');
    expect(getPluginPackageName('my-plugin/strapi-admin')).toBe('my-plugin');
  });

  it('detects ESM via type module or exports.import', () => {
    expect(isEsmPackage({ type: 'module' })).toBe(true);
    expect(
      isEsmPackage({
        exports: {
          '.': {
            import: './dist/index.js',
          },
        },
      })
    ).toBe(true);
    expect(isEsmPackage({ main: 'index.js' })).toBe(false);
  });

  it('detects React peer dependencies', () => {
    expect(hasReactPeerDependency({ peerDependencies: { react: '^18.0.0' } })).toBe(true);
    expect(hasReactPeerDependency({ peerDependencies: { 'styled-components': '^6.0.0' } })).toBe(
      false
    );
  });

  it('detects dist-based entry points', () => {
    expect(shipsPreBuiltDist({ module: './dist/index.js' })).toBe(true);
    expect(shipsPreBuiltDist({ files: ['dist'] })).toBe(true);
    expect(shipsPreBuiltDist({ module: './lib/index.js' })).toBe(false);
  });

  it('allowlists only known thin UI kits', () => {
    expect(ADMIN_VITE_OPTIMIZE_DEPS_EXCLUDE_ALLOWLIST.has('strapi-design-extended')).toBe(true);
    expect(ADMIN_VITE_OPTIMIZE_DEPS_EXCLUDE_ALLOWLIST.has('@_sh/strapi-plugin-ckeditor')).toBe(
      false
    );
  });

  it('reads package.json opt-in for optimizeDeps.exclude', () => {
    expect(
      packageOptsIntoOptimizeDepsExclude({
        strapi: { admin: { vite: { optimizeDepsExclude: true } } },
      } as PackageJsonLike)
    ).toBe(true);
    expect(packageOptsIntoOptimizeDepsExclude(strapiDesignExtendedLike as PackageJsonLike)).toBe(
      false
    );
  });

  it('excludes by allowlist or opt-in only — never by package shape (#27136)', () => {
    expect(
      isEligibleForOptimizeDepsExclude('strapi-design-extended', strapiDesignExtendedLike)
    ).toBe(true);
    // Allowlisted even when package metadata is missing (exports often omit package.json)
    expect(isEligibleForOptimizeDepsExclude('strapi-design-extended', null)).toBe(true);
    expect(
      isEligibleForOptimizeDepsExclude('@_sh/strapi-plugin-ckeditor', ckeditorPluginLike)
    ).toBe(false);
    expect(
      isEligibleForOptimizeDepsExclude(
        'my-thin-ui-kit',
        preBuiltReactPeerPackage('my-thin-ui-kit', {
          strapi: { admin: { vite: { optimizeDepsExclude: true } } },
        })
      )
    ).toBe(true);
    // Opt-in alone is enough — shape is not required
    expect(
      isEligibleForOptimizeDepsExclude('opted-in-cjs', {
        name: 'opted-in-cjs',
        main: 'index.js',
        peerDependencies: { react: '^18.0.0' },
        strapi: { admin: { vite: { optimizeDepsExclude: true } } },
      } as PackageJsonLike)
    ).toBe(true);
    // Shape without declare is never enough
    expect(
      isEligibleForOptimizeDepsExclude('shape-only-kit', preBuiltReactPeerPackage('shape-only-kit'))
    ).toBe(false);
  });
});

type PackageJsonLike = Parameters<typeof packageOptsIntoOptimizeDepsExclude>[0];

describe('collectAdminOptimizeDepsExclude', () => {
  const getModuleMock = getModule as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    readPkgUp.mockResolvedValue(undefined);
  });

  it('excludes allowlisted pre-built React peer libraries from plugin dependencies', async () => {
    const plugins: PluginMeta[] = [
      {
        name: 'my-plugin',
        importName: 'myPlugin',
        type: 'module',
        modulePath: '@org/my-plugin/strapi-admin',
      },
    ];

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === '@org/my-plugin') {
        return {
          dependencies: {
            'strapi-design-extended': '^0.0.13',
          },
        };
      }

      if (name === 'strapi-design-extended') {
        return strapiDesignExtendedLike;
      }

      return null;
    });

    await expect(collectAdminOptimizeDepsExclude('/app', plugins)).resolves.toEqual([
      'strapi-design-extended',
    ]);
  });

  it('does not auto-exclude CKEditor-class plugins that only match the UI-kit shape (#27136)', async () => {
    const plugins: PluginMeta[] = [
      {
        name: 'ckeditor',
        importName: 'ckeditor',
        type: 'module',
        modulePath: '@_sh/strapi-plugin-ckeditor/strapi-admin',
      },
    ];

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === '@_sh/strapi-plugin-ckeditor') {
        return ckeditorPluginLike;
      }

      return null;
    });

    readPkgUp.mockResolvedValue({
      packageJson: {
        dependencies: {
          '@_sh/strapi-plugin-ckeditor': '^1.0.0',
        },
      },
    });

    await expect(collectAdminOptimizeDepsExclude('/app', plugins)).resolves.toEqual([]);
  });

  it('excludes allowlisted packages even when getModule cannot read package.json', async () => {
    readPkgUp.mockResolvedValue({
      packageJson: {
        dependencies: {
          'strapi-design-extended': '^0.0.13',
        },
      },
    });

    getModuleMock.mockResolvedValue(null);

    await expect(collectAdminOptimizeDepsExclude('/app', [])).resolves.toEqual([
      'strapi-design-extended',
    ]);
  });

  it('does not exclude shape-matching packages without allowlist or opt-in', async () => {
    readPkgUp.mockResolvedValue({
      packageJson: {
        dependencies: {
          'shape-only-kit': '^1.0.0',
        },
      },
    });

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === 'shape-only-kit') {
        return preBuiltReactPeerPackage('shape-only-kit');
      }

      return null;
    });

    await expect(collectAdminOptimizeDepsExclude('/app', [])).resolves.toEqual([]);
  });

  it('excludes packages that opt in via strapi.admin.vite.optimizeDepsExclude', async () => {
    const plugins: PluginMeta[] = [
      {
        name: 'my-plugin',
        importName: 'myPlugin',
        type: 'module',
        modulePath: '@org/my-plugin/strapi-admin',
      },
    ];

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === '@org/my-plugin') {
        return {
          dependencies: {
            'my-thin-ui-kit': '^1.0.0',
          },
        };
      }

      if (name === 'my-thin-ui-kit') {
        return preBuiltReactPeerPackage('my-thin-ui-kit', {
          strapi: { admin: { vite: { optimizeDepsExclude: true } } },
        });
      }

      return null;
    });

    await expect(collectAdminOptimizeDepsExclude('/app', plugins)).resolves.toEqual([
      'my-thin-ui-kit',
    ]);
  });

  it('never excludes @strapi/strapi from app root but still excludes allowlisted UI kits', async () => {
    readPkgUp.mockResolvedValue({
      packageJson: {
        dependencies: {
          '@strapi/strapi': '5.50.2',
          'strapi-design-extended': '^0.0.13',
        },
      },
    });

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === '@strapi/strapi') {
        return preBuiltReactPeerPackage('@strapi/strapi');
      }

      if (name === 'strapi-design-extended') {
        return strapiDesignExtendedLike;
      }

      return null;
    });

    await expect(collectAdminOptimizeDepsExclude('/app', [])).resolves.toEqual([
      'strapi-design-extended',
    ]);
  });

  it('never auto-excludes official @strapi packages that match the heuristic', async () => {
    const plugins: PluginMeta[] = [
      {
        name: 'my-plugin',
        importName: 'myPlugin',
        type: 'module',
        modulePath: '@org/my-plugin/strapi-admin',
      },
    ];

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === '@org/my-plugin') {
        return {
          dependencies: {
            '@strapi/icons': '2.2.0',
          },
        };
      }

      if (name === '@strapi/icons') {
        return preBuiltReactPeerPackage('@strapi/icons');
      }

      return null;
    });

    await expect(collectAdminOptimizeDepsExclude('/app', plugins)).resolves.toEqual([]);
  });

  it('never excludes pinned admin singleton modules from plugin dependencies', async () => {
    const plugins: PluginMeta[] = [
      {
        name: 'my-plugin',
        importName: 'myPlugin',
        type: 'module',
        modulePath: '@org/my-plugin/strapi-admin',
      },
    ];

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === '@org/my-plugin') {
        return {
          dependencies: Object.fromEntries(
            PINNED_OPTIMIZE_MODULES.map((moduleName) => [moduleName, '1.0.0'])
          ),
        };
      }

      if (PINNED_OPTIMIZE_MODULES.includes(name as (typeof PINNED_OPTIMIZE_MODULES)[number])) {
        return preBuiltReactPeerPackage(name);
      }

      return null;
    });

    await expect(collectAdminOptimizeDepsExclude('/app', plugins)).resolves.toEqual([]);
  });

  it('never auto-excludes CodeMirror singletons even though @uiw/react-codemirror matches the heuristic', async () => {
    // @uiw/react-codemirror is ESM, ships dist and has a React peer — it matches
    // shouldExcludeFromOptimizeDeps, so the singleton guard is what keeps it pre-bundled
    expect(shouldExcludeFromOptimizeDeps(preBuiltReactPeerPackage('@uiw/react-codemirror'))).toBe(
      true
    );

    readPkgUp.mockResolvedValue({
      packageJson: {
        dependencies: Object.fromEntries(
          ADMIN_VITE_SINGLETON_MODULES.map((moduleName) => [moduleName, '1.0.0'])
        ),
      },
    });

    getModuleMock.mockImplementation(async (name: string) => {
      if (
        ADMIN_VITE_SINGLETON_MODULES.includes(name as (typeof ADMIN_VITE_SINGLETON_MODULES)[number])
      ) {
        return preBuiltReactPeerPackage(name);
      }

      return null;
    });

    await expect(collectAdminOptimizeDepsExclude('/app', [])).resolves.toEqual([]);
  });

  it('does not exclude @strapi/strapi or alias modules for a typical consumer app', async () => {
    const plugins: PluginMeta[] = [
      {
        name: 'users-permissions',
        importName: 'usersPermissions',
        type: 'module',
        modulePath: '@strapi/plugin-users-permissions/strapi-admin',
      },
    ];

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === '@strapi/plugin-users-permissions') {
        return {
          dependencies: {
            '@strapi/design-system': '^2.2.0',
            '@strapi/strapi': '5.50.2',
            react: '^18.0.0',
            'strapi-design-extended': '^0.0.13',
          },
        };
      }

      if (
        name === '@strapi/strapi' ||
        ADMIN_VITE_ALIAS_MODULES.includes(name as (typeof ADMIN_VITE_ALIAS_MODULES)[number])
      ) {
        return preBuiltReactPeerPackage(name);
      }

      if (name === 'strapi-design-extended') {
        return strapiDesignExtendedLike;
      }

      return null;
    });

    await expect(collectAdminOptimizeDepsExclude('/app', plugins)).resolves.toEqual([
      'strapi-design-extended',
    ]);
  });
});
