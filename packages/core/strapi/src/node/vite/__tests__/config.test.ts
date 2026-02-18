import fs from 'node:fs';
import path from 'node:path';
import resolveFrom from 'resolve-from';
import { getLocalPluginDedupe } from '../config';
import type { BuildContext } from '../../create-build-context';

jest.mock('../plugins', () => ({ buildFilesPlugin: jest.fn() }));
jest.mock('../../staticFiles', () => ({ getDocumentHTML: jest.fn() }));
jest.mock('browserslist-to-esbuild', () => jest.fn());
jest.mock('@vitejs/plugin-react-swc', () => jest.fn());
jest.mock('node:fs');
jest.mock('resolve-from');

const CORE_ADMIN_DEPS = ['react', 'react-dom', 'react-router-dom', 'styled-components'];

/* ------------------------------------------------------------------ */
/*  Shared fixtures & helpers                                         */
/* ------------------------------------------------------------------ */

const createLocalPlugin = (name: string, pluginPath?: string): BuildContext['plugins'][number] => ({
  name,
  importName: name.replace(/-./g, (m) => m[1].toUpperCase()),
  type: 'local' as const,
  path: pluginPath ?? `./src/plugins/${name}`,
  modulePath: `../../src/plugins/${name}/dist/admin/index.mjs`,
});

const createModulePlugin = (name: string, modulePath: string): BuildContext['plugins'][number] => ({
  name,
  importName: name,
  type: 'module' as const,
  modulePath,
});

const createMockContext = (
  plugins: BuildContext['plugins'],
  cwd = '/app'
): BuildContext => ({ cwd, plugins } as unknown as BuildContext);

/**
 * Set up fs mocks so that `readFileSync` returns the given package contents
 * keyed by plugin path. Paths without an entry will throw.
 */
const mockPluginPackages = (packages: Record<string, object | string>) => {
  const knownPaths = new Set(
    Object.keys(packages).map((pluginPath) => path.join(pluginPath, 'package.json'))
  );

  (fs.existsSync as jest.Mock).mockImplementation((p: string) => knownPaths.has(p));

  (fs.readFileSync as jest.Mock).mockImplementation((p: string) => {
    for (const [pluginPath, content] of Object.entries(packages)) {
      if (p === path.join(pluginPath, 'package.json')) {
        return typeof content === 'string' ? content : JSON.stringify(content);
      }
    }
    throw new Error(`Unexpected read: ${p}`);
  });
};

const expectOnlyCoreAdminDeps = (result: string[]) => {
  expect(result).toEqual(expect.arrayContaining(CORE_ADMIN_DEPS));
  expect(result).toHaveLength(CORE_ADMIN_DEPS.length);
};

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('getLocalPluginDedupe', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    (resolveFrom.silent as jest.Mock).mockImplementation(
      (_cwd: string, modulePath: string) => `/app/node_modules/${modulePath}`
    );
  });

  it('returns core admin deps when there are no plugins', () => {
    expectOnlyCoreAdminDeps(getLocalPluginDedupe(createMockContext([])));
  });

  it('returns core admin deps when plugins are all module type', () => {
    const plugins = [createModulePlugin('i18n', '@strapi/i18n/strapi-admin')];

    expectOnlyCoreAdminDeps(getLocalPluginDedupe(createMockContext(plugins)));
  });

  it('collects dependencies from a local plugin package.json', () => {
    const plugin = createLocalPlugin('my-plugin');

    mockPluginPackages({
      [plugin.path!]: {
        dependencies: { '@strapi/design-system': '2.1.2', '@strapi/icons': '2.1.2' },
        peerDependencies: { 'react-intl': '^6.0.0' },
      },
    });

    const result = getLocalPluginDedupe(createMockContext([plugin]));

    expect(result).toEqual(
      expect.arrayContaining([
        ...CORE_ADMIN_DEPS,
        '@strapi/design-system',
        '@strapi/icons',
        'react-intl',
      ])
    );
  });

  it('collects dependencies from multiple local plugins', () => {
    const pluginA = createLocalPlugin('plugin-a');
    const pluginB = createLocalPlugin('plugin-b');

    mockPluginPackages({
      [pluginA.path!]: { dependencies: { '@strapi/design-system': '2.1.2' } },
      [pluginB.path!]: { dependencies: { '@strapi/icons': '2.1.2', lodash: '4.17.21' } },
    });

    const result = getLocalPluginDedupe(createMockContext([pluginA, pluginB]));

    expect(result).toEqual(
      expect.arrayContaining([...CORE_ADMIN_DEPS, '@strapi/design-system', '@strapi/icons', 'lodash'])
    );
  });

  it('deduplicates overlapping dependencies across plugins', () => {
    const pluginA = createLocalPlugin('plugin-a');
    const pluginB = createLocalPlugin('plugin-b');

    mockPluginPackages({
      [pluginA.path!]: { dependencies: { '@strapi/design-system': '2.1.2' } },
      [pluginB.path!]: { dependencies: { '@strapi/design-system': '2.0.0' } },
    });

    const result = getLocalPluginDedupe(createMockContext([pluginA, pluginB]));

    expect(result.filter((d) => d === '@strapi/design-system')).toHaveLength(1);
  });

  it('excludes dependencies not resolvable from the project root', () => {
    const plugin = createLocalPlugin('my-plugin');

    mockPluginPackages({
      [plugin.path!]: {
        dependencies: { '@strapi/design-system': '2.1.2', 'some-plugin-only-dep': '1.0.0' },
      },
    });

    (resolveFrom.silent as jest.Mock).mockImplementation(
      (_cwd: string, modulePath: string) => {
        if (modulePath.startsWith('some-plugin-only-dep')) return undefined;
        return `/app/node_modules/${modulePath}`;
      }
    );

    const result = getLocalPluginDedupe(createMockContext([plugin]));

    expect(result).toContain('@strapi/design-system');
    expect(result).not.toContain('some-plugin-only-dep');
  });

  it('skips local plugins without a package.json', () => {
    const plugin = createLocalPlugin('no-pkg');

    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expectOnlyCoreAdminDeps(getLocalPluginDedupe(createMockContext([plugin])));
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it('handles malformed package.json gracefully', () => {
    const plugin = createLocalPlugin('bad-json');

    mockPluginPackages({ [plugin.path!]: '{ invalid json' });

    expectOnlyCoreAdminDeps(getLocalPluginDedupe(createMockContext([plugin])));
  });

  it('handles package.json with no dependencies or peerDependencies', () => {
    const plugin = createLocalPlugin('empty-deps');

    mockPluginPackages({ [plugin.path!]: { name: 'empty-deps' } });

    expectOnlyCoreAdminDeps(getLocalPluginDedupe(createMockContext([plugin])));
  });

  it('resolves dependencies against the provided cwd', () => {
    const plugin = createLocalPlugin('my-plugin');
    const cwd = '/custom/project';

    mockPluginPackages({
      [plugin.path!]: { dependencies: { '@strapi/design-system': '2.1.2' } },
    });

    getLocalPluginDedupe(createMockContext([plugin], cwd));

    expect(resolveFrom.silent).toHaveBeenCalledWith(
      cwd,
      expect.stringContaining('@strapi/design-system')
    );
  });
});
