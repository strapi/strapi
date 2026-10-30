import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { getEntryModule, getStylesheet, writeStaticClientFiles } from '../staticFiles';

import type { BuildContext } from '../create-build-context';

// Prettier loads its plugins with a dynamic import, which Jest cannot run without --experimental-vm-modules
jest.mock('prettier', () => ({ format: async (source: string) => source }));

// The exports-map target of the fixture design system, so no test depends on the installed copy
const sourceTarget = '/fixture/@strapi/design-system/src/next/source.css';

jest.mock('../core/admin-vite-aliases', () => ({
  getSubpathEntries: () => [
    ['@strapi/design-system', '/fixture/@strapi/design-system/dist/index.mjs'],
    ['@strapi/design-system/next/source.css', sourceTarget],
  ],
}));

describe('getStylesheet', () => {
  const ctx = (scanRoots: string[]) => ({ scanRoots }) as unknown as BuildContext;

  test('imports the design system source that @strapi/admin resolves', () => {
    expect(getStylesheet(ctx([]))).toContain(`@import "${sourceTarget}";`);
  });

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

  test('excludes the nested node_modules of every root', () => {
    const sheet = getStylesheet(ctx(['/app/src/admin', '/app/plugins/local/dist/admin']));

    expect(sheet).toContain(`@source not "/app/src/admin/**/node_modules/**";`);
    expect(sheet).toContain(`@source not "/app/plugins/local/dist/admin/**/node_modules/**";`);
  });

  test('still scans a root that lives under node_modules', () => {
    const root = '/app/node_modules/@strapi/admin/dist/admin';
    const sheet = getStylesheet(ctx([root]));

    expect(sheet).toContain(`@source "${root}";`);
    expect(sheet).toContain(`@source not "${root}/**/node_modules/**";`);
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

describe('getEntryModule', () => {
  const ctx = (bundler: BuildContext['bundler']) =>
    ({ bundler, plugins: [] }) as unknown as BuildContext;

  test.each(['vite', 'webpack'] as const)('imports the admin stylesheet under %s', (bundler) => {
    expect(getEntryModule(ctx(bundler))).toContain("import './styles.css';");
  });
});

describe('writeStaticClientFiles', () => {
  let runtimeDir: string;

  beforeEach(async () => {
    runtimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-client-'));
  });

  afterEach(async () => {
    await fs.rm(runtimeDir, { recursive: true, force: true });
  });

  test('writes the admin stylesheet under webpack', async () => {
    const ctx = {
      bundler: 'webpack',
      runtimeDir,
      plugins: [],
      scanRoots: [],
      logger: { debug: jest.fn() },
    } as unknown as BuildContext;

    await writeStaticClientFiles(ctx);

    expect((await fs.readdir(runtimeDir)).sort()).toEqual(['app.js', 'index.html', 'styles.css']);
  });
});
