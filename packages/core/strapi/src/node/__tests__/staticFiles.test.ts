import { getEntryModule, getStylesheet } from '../staticFiles';

import type { BuildContext } from '../create-build-context';

/**
 * A build context is a wide interface of which these writers read a field or two, so both `ctx`
 * factories below cast a literal rather than stand up a real context
 */

describe('getStylesheet', () => {
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
  const ctx = (nextDesignSystem: boolean) =>
    ({ nextDesignSystem, plugins: [] }) as unknown as BuildContext;

  test('imports the host stylesheet when the next design system is on', () => {
    expect(getEntryModule(ctx(true))).toContain("import './styles.css';");
  });

  test('imports no stylesheet when the next design system is off', () => {
    expect(getEntryModule(ctx(false))).not.toContain('styles.css');
  });
});
