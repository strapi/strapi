import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { getScanRoots, HOST_ADMIN_PACKAGES } from '../scan-roots';
import { getMonorepoAliases, getMonorepoEeAdminSource } from '../aliases';
import { loadStrapiMonorepo } from '../monorepo';

import type { BuildContext } from '../../create-build-context';
import type { PluginMeta } from '../plugins';

jest.mock('node:module', () => ({ createRequire: jest.fn() }));
jest.mock('../aliases', () => ({
  ...jest.requireActual('../aliases'),
  getMonorepoAliases: jest.fn(() => ({})),
}));
jest.mock('../monorepo', () => ({ loadStrapiMonorepo: jest.fn(async () => undefined) }));

const MONOREPO = '/repo';
const APP = '/app';

/** `getScanRoots` reads this with a bare `require.resolve`, which this file does not mock */
const HOST_MANIFEST_PATH = require.resolve('@strapi/strapi/package.json');

/**
 * One resolution table per `createRequire` base. An empty entry table proves that the host packages
 * come from the `@strapi/strapi` manifest, which is the only place strict pnpm resolves them
 */
const HOST_RESOLVED: Record<string, string> = Object.fromEntries(
  HOST_ADMIN_PACKAGES.map((name) => [
    `${name}/strapi-admin`,
    `/node_modules/${name}/dist/admin/index.js`,
  ])
);

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
  (getMonorepoAliases as jest.Mock).mockReturnValue({});
  (loadStrapiMonorepo as jest.Mock).mockResolvedValue(undefined);
});

describe('getScanRoots', () => {
  test('holds every host admin package', async () => {
    const roots = await getScanRoots(scanContext([]), false);

    expect(roots).toEqual(HOST_ADMIN_PACKAGES.map((name) => `/node_modules/${name}/dist/admin`));
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
});

/**
 * The hand-written host list and the imports in `src/admin.ts` must not drift. Drift is the one way
 * the list can miss a package
 */
describe('the host admin packages', () => {
  const packageRoot = path.dirname(HOST_MANIFEST_PATH);

  // The file re-exports the same packages, so the matches need a dedupe
  const imported = () => [
    ...new Set(
      [
        ...readFileSync(path.join(packageRoot, 'src', 'admin.ts'), 'utf8').matchAll(
          /from '(.+)\/strapi-admin';/g
        ),
      ].map(([, name]) => name)
    ),
  ];

  test('are the same list that src/admin.ts imports', () => {
    expect([...HOST_ADMIN_PACKAGES].sort()).toEqual(imported().sort());
  });

  test('name an Enterprise source directory that exists', () => {
    // Three levels up from `packages/core/strapi/package.json` is the monorepo root
    const monorepoPath = path.dirname(path.dirname(path.dirname(packageRoot)));
    const eeAdminSource = getMonorepoEeAdminSource({ monorepo: { path: monorepoPath } });

    expect(eeAdminSource).toBeDefined();
    expect(existsSync(String(eeAdminSource))).toBe(true);
  });
});
