import path from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';

import { getScanRoots, getStylesheet } from '../staticFiles';
import { getMonorepoAliases } from '../core/aliases';
import { loadStrapiMonorepo } from '../core/monorepo';

import type { BuildContext } from '../create-build-context';
import type { PluginMeta } from '../core/plugins';

jest.mock('node:module', () => ({ createRequire: jest.fn() }));
jest.mock('node:fs', () => ({ readFileSync: jest.fn() }));
jest.mock('node:fs/promises', () => ({ stat: jest.fn(), mkdir: jest.fn(), writeFile: jest.fn() }));
jest.mock('../core/aliases', () => ({
  ...jest.requireActual('../core/aliases'),
  getMonorepoAliases: jest.fn(() => ({})),
}));
jest.mock('../core/monorepo', () => ({ loadStrapiMonorepo: jest.fn(async () => undefined) }));

const MONOREPO = '/repo';
const APP = '/app';

/** `email` exports `./strapi-admin` and `utils` does not, so the derived list must drop `utils` */
const HOST_MANIFEST = {
  name: '@strapi/strapi',
  dependencies: {
    '@strapi/admin': '5.0.0',
    '@strapi/content-manager': '5.0.0',
    '@strapi/email': '5.0.0',
    '@strapi/utils': '5.0.0',
    lodash: '4.0.0',
  },
};

const HOST_ADMIN_PACKAGES = ['@strapi/admin', '@strapi/content-manager', '@strapi/email'];

/** `getScanRoots` reads this with a bare `require.resolve`, which this file does not mock */
const HOST_MANIFEST_PATH = require.resolve('@strapi/strapi/package.json');

/**
 * One resolution table per `createRequire` base. An empty entry table proves that the host packages
 * come from the `@strapi/strapi` manifest, which is the only place strict pnpm resolves them
 */
const HOST_RESOLVED: Record<string, string> = Object.fromEntries(
  Object.keys(HOST_MANIFEST.dependencies).map((name) => [
    `${name}/package.json`,
    `/node_modules/${name}/package.json`,
  ])
);

/** `@strapi/email` uses the string form of the export key, which is legal and must read the same */
const ADMIN_ENTRY = { types: './dist/admin/src/index.d.ts', default: './dist/admin/index.js' };

const PACKAGE_MANIFESTS: Record<string, object> = {
  '/node_modules/@strapi/admin/package.json': { exports: { './strapi-admin': ADMIN_ENTRY } },
  '/node_modules/@strapi/content-manager/package.json': {
    exports: { './strapi-admin': ADMIN_ENTRY },
  },
  '/node_modules/@strapi/email/package.json': {
    exports: { './strapi-admin': './dist/admin/index.js' },
  },
  '/node_modules/@strapi/utils/package.json': { exports: { '.': './dist/index.js' } },
  '/node_modules/lodash/package.json': { main: './index.js' },
};

const ENTRY_RESOLVED: Record<string, string> = {
  '@strapi/plugin-color-picker/strapi-admin':
    '/node_modules/@strapi/plugin-color-picker/dist/admin/index.js',
  'community-plugin/strapi-admin': '/node_modules/community-plugin/dist/admin/index.js',
  '../../src/plugins/local-plugin/strapi-admin': '/app/src/plugins/local-plugin/strapi-admin.js',
};

let entryResolved: Record<string, string>;
let hostResolved: Record<string, string>;

const fakeRequire = (table: Record<string, string>) =>
  ({
    resolve(modulePath: string) {
      const resolved = table[modulePath];

      if (!resolved) {
        throw Object.assign(new Error(`Cannot find module '${modulePath}'`), {
          code: 'MODULE_NOT_FOUND',
        });
      }

      return resolved;
    },
    // A `NodeRequire` carries `cache`, `main` and `extensions`; the code under test calls
    // `resolve` alone
  }) as unknown as NodeRequire;

const modulePlugin = (name: string, modulePath: string): PluginMeta => ({
  name,
  importName: name,
  type: 'module',
  modulePath,
});

const scanContext = (plugins: PluginMeta[], customisations?: { path: string }) =>
  ({
    cwd: APP,
    runtimeDir: path.join(APP, '.strapi', 'client'),
    plugins,
    // The fixture supplies the `path` the code reads; the real type also carries `modulePath`
    customisations: customisations as BuildContext['customisations'],
  }) satisfies Parameters<typeof getScanRoots>[0];

beforeEach(() => {
  jest.clearAllMocks();
  entryResolved = { ...ENTRY_RESOLVED };
  hostResolved = { ...HOST_RESOLVED };
  (createRequire as jest.Mock).mockImplementation((from: string) =>
    from === HOST_MANIFEST_PATH ? fakeRequire(hostResolved) : fakeRequire(entryResolved)
  );
  (readFileSync as jest.Mock).mockImplementation((file: string) =>
    JSON.stringify(file === HOST_MANIFEST_PATH ? HOST_MANIFEST : (PACKAGE_MANIFESTS[file] ?? {}))
  );
  (getMonorepoAliases as jest.Mock).mockReturnValue({});
  (loadStrapiMonorepo as jest.Mock).mockResolvedValue(undefined);
  (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
});

describe('getScanRoots', () => {
  test('holds every host admin package that the manifest names', async () => {
    const roots = await getScanRoots(scanContext([]), false);

    expect(roots).toEqual(HOST_ADMIN_PACKAGES.map((name) => `/node_modules/${name}/dist/admin`));
  });

  test('drops a host dependency that exports no admin entry', async () => {
    const roots = await getScanRoots(scanContext([]), false);

    expect(roots.join('\n')).not.toContain('@strapi/utils');
    expect(roots.join('\n')).not.toContain('lodash');
  });

  test('holds a module plugin', async () => {
    const roots = await getScanRoots(
      scanContext([modulePlugin('color-picker', '@strapi/plugin-color-picker/strapi-admin')]),
      false
    );

    expect(roots).toContain('/node_modules/@strapi/plugin-color-picker/dist/admin');
  });

  test('holds a local plugin, from the directory of its entry', async () => {
    const roots = await getScanRoots(
      scanContext([
        {
          name: 'local-plugin',
          importName: 'localPlugin',
          type: 'local',
          path: '/app/src/plugins/local-plugin',
          modulePath: '../../src/plugins/local-plugin/strapi-admin',
        },
      ]),
      false
    );

    expect(roots).toContain('/app/src/plugins/local-plugin');
  });

  test('holds the application admin directory', async () => {
    const roots = await getScanRoots(scanContext([], { path: '/app/src/admin/app.tsx' }), false);

    expect(roots).toContain('/app/src/admin');
  });

  test('scans the served source and the Enterprise tree in monorepo development', async () => {
    (loadStrapiMonorepo as jest.Mock).mockResolvedValue({ path: MONOREPO });
    (getMonorepoAliases as jest.Mock).mockReturnValue({
      '@strapi/admin/strapi-admin': '/repo/packages/core/admin/admin/src',
      '@strapi/plugin-color-picker/strapi-admin': '/repo/packages/plugins/color-picker/admin/src',
    });

    const roots = await getScanRoots(
      scanContext([modulePlugin('color-picker', '@strapi/plugin-color-picker/strapi-admin')]),
      true
    );

    expect(roots).toContain('/repo/packages/core/admin/admin/src');
    expect(roots).toContain('/repo/packages/core/admin/ee/admin/src');
    expect(roots).toContain('/repo/packages/plugins/color-picker/admin/src');
    expect(roots).not.toContain('/node_modules/@strapi/admin/dist/admin');
  });

  test('resolves the host packages from the manifest of @strapi/strapi', async () => {
    const roots = await getScanRoots(scanContext([]), false);

    expect(createRequire).toHaveBeenCalledWith(HOST_MANIFEST_PATH);
    // The entry table holds no host package, so this list can come from the host require only
    expect(Object.keys(entryResolved)).not.toContain('@strapi/admin/strapi-admin');
    expect(roots).toContain('/node_modules/@strapi/admin/dist/admin');
  });

  test('keeps both roots when the entry resolves the same package elsewhere', async () => {
    entryResolved['@strapi/email/strapi-admin'] = '/app/node_modules/@strapi/email/dist/admin/i.js';

    const roots = await getScanRoots(
      scanContext([modulePlugin('email', '@strapi/email/strapi-admin')]),
      false
    );

    expect(roots).toContain('/node_modules/@strapi/email/dist/admin');
    expect(roots).toContain('/app/node_modules/@strapi/email/dist/admin');
  });

  test('holds one root for a package that is both a host dependency and a plugin', async () => {
    // Yarn hoists, so both requires answer with the same directory
    entryResolved['@strapi/email/strapi-admin'] = '/node_modules/@strapi/email/dist/admin/index.js';

    const roots = await getScanRoots(
      scanContext([modulePlugin('email', '@strapi/email/strapi-admin')]),
      false
    );

    expect(roots.filter((dir) => dir === '/node_modules/@strapi/email/dist/admin')).toHaveLength(1);
    expect(roots).toHaveLength(HOST_ADMIN_PACKAGES.length);
  });

  test('stops the build and names a directory that does not exist', async () => {
    (fs.stat as jest.Mock).mockImplementation(async (dir: string) =>
      dir.includes('email') ? Promise.reject(new Error('ENOENT')) : { isDirectory: () => true }
    );

    await expect(getScanRoots(scanContext([]), false)).rejects.toThrow(
      '/node_modules/@strapi/email/dist/admin'
    );
  });
});

describe('getStylesheet', () => {
  // `getStylesheet` reads `scanRoots` alone, so a whole `BuildContext` would be noise
  const ctx = (scanRoots: string[]) => ({ scanRoots }) as unknown as BuildContext;

  test('quotes a path that holds an apostrophe, and adds no backslash', () => {
    const sheet = getStylesheet(ctx(["/Users/o'brien/app/src/admin"]));

    expect(sheet).toContain(`@source "/Users/o'brien/app/src/admin";`);
    expect(sheet).not.toContain('\\');
  });

  test('excludes the files that reach no page', () => {
    const sheet = getStylesheet(ctx(['/pkg/dist/admin']));

    expect(sheet).toContain(`@source not "/pkg/dist/admin/**/__tests__/**";`);
    expect(sheet).toContain(`@source not "/pkg/dist/admin/**/*.test.*";`);
    expect(sheet).toContain(`@source not "/pkg/dist/admin/**/*.stories.*";`);
    expect(sheet).toContain(`@source not "/pkg/dist/admin/**/*.d.ts";`);
    expect(sheet).toContain(`@source not "/pkg/dist/admin/**/*.map";`);
  });

  test('quotes with an apostrophe when the path holds a double quote', () => {
    const sheet = getStylesheet(ctx(['/pkg/we"ird/dist']));

    expect(sheet).toContain(`@source '/pkg/we"ird/dist';`);
  });

  test('writes a Windows path as a forward-slash glob', () => {
    const sheet = getStylesheet(ctx(['C:\\app\\node_modules\\@strapi\\admin\\dist\\admin']));

    expect(sheet).toContain('@source "C:/app/node_modules/@strapi/admin/dist/admin";');
    expect(sheet).toContain('@source not "C:/app/node_modules/@strapi/admin/dist/admin/**/*.map";');
    expect(sheet).not.toContain('\\');
  });

  test('stops when the path holds both quote characters', () => {
    expect(() => getStylesheet(ctx([`/pkg/o'br"ien`]))).toThrow('both quote characters');
  });
});
