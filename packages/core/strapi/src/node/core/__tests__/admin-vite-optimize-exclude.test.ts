import {
  collectAdminOptimizeDepsExclude,
  collectCandidateDependencyNames,
  getPluginPackageName,
  hasReactPeerDependency,
  isEsmPackage,
  shipsPreBuiltDist,
  shouldExcludeFromOptimizeDeps,
} from '../admin-vite-optimize-exclude';
import { ADMIN_VITE_ALIAS_MODULES } from '../admin-vite-alias-modules';
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

const PINNED_OPTIMIZE_MODULES = [...ADMIN_VITE_ALIAS_MODULES, '@strapi/strapi'] as const;

const preBuiltReactPeerPackage = (name: string) => ({
  name,
  type: 'module',
  module: './dist/index.js',
  files: ['dist'],
  peerDependencies: {
    react: '^18.0.0',
    'react-dom': '^18.0.0',
  },
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
});

describe('collectAdminOptimizeDepsExclude', () => {
  const getModuleMock = getModule as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    readPkgUp.mockResolvedValue(undefined);
  });

  it('excludes pre-built React peer libraries from plugin dependencies', async () => {
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

  it('never excludes @strapi/strapi from app root but still excludes matching UI kits', async () => {
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

  it('excludes pre-built React peer libraries reachable only transitively', async () => {
    readPkgUp.mockResolvedValue({
      packageJson: {
        dependencies: {
          '@org/my-plugin': '^1.0.0',
        },
      },
    });

    getModuleMock.mockImplementation(async (name: string) => {
      if (name === '@org/my-plugin') {
        return {
          dependencies: {
            'plugin-ui-kit': '^2.0.0',
          },
        };
      }

      if (name === 'plugin-ui-kit') {
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

    await expect(collectAdminOptimizeDepsExclude('/app', [])).resolves.toEqual([
      'strapi-design-extended',
    ]);
  });
});

describe('collectCandidateDependencyNames', () => {
  const getModuleMock = getModule as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('walks transitive dependencies without revisiting packages', async () => {
    getModuleMock.mockImplementation(async (name: string) => {
      if (name === 'root') {
        return { dependencies: { mid: '^1.0.0' } };
      }

      if (name === 'mid') {
        return { dependencies: { leaf: '^1.0.0', root: '^1.0.0' } };
      }

      if (name === 'leaf') {
        return { name: 'leaf' };
      }

      return null;
    });

    await expect(collectCandidateDependencyNames('/app', ['root'])).resolves.toEqual(
      new Set(['root', 'mid', 'leaf'])
    );
  });
});
