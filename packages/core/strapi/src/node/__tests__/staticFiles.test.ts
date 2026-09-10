import { getStylesheet } from '../staticFiles';

import type { BuildContext } from '../create-build-context';

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
