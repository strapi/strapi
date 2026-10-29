import * as ts from 'typescript';

import { generateStrictDefinitions } from '../../../generators/strict';

// A Strapi instance whose `typescript` config holds `typescript`.
const strapiWith = (typescript: Record<string, unknown> = {}) => ({
  config: {
    get(path: string, fallback?: unknown) {
      const [namespace, key] = path.split('.');
      return namespace === 'typescript' && key !== undefined && Object.hasOwn(typescript, key)
        ? typescript[key]
        : fallback;
    },
  },
});

describe('generateStrictDefinitions', () => {
  test('emits the type-only opt-in to strict server contracts through @strapi/strapi', async () => {
    const { output } = await generateStrictDefinitions({ strapi: strapiWith() });

    expect(output).toContain("import type {} from '@strapi/strapi/strict-types';");
    // must not reach into @strapi/types or a plugin directly: the app does not depend on them
    expect(output).not.toContain('@strapi/types');
    expect(output).not.toContain('strapi-server');
  });

  test('declares the license scope with no licensed feature when `licensedFeatures` is unset', async () => {
    const { output } = await generateStrictDefinitions({ strapi: strapiWith() });

    expect(output).toContain(
      [
        '      interface Settings {',
        "        licenses: 'declared';",
        '      }',
        '',
        '      interface LicensedFeatures {}',
      ].join('\n')
    );
  });

  test('lists each licensed feature once, in config order', async () => {
    const { output } = await generateStrictDefinitions({
      strapi: strapiWith({
        licensedFeatures: ['review-workflows', 'licensed', 'review-workflows'],
      }),
    });

    expect(output).toContain(
      [
        '      interface LicensedFeatures {',
        '        "review-workflows": true;',
        '        "licensed": true;',
        '      }',
      ].join('\n')
    );
    expect(output.match(/"review-workflows"/g)).toHaveLength(1);
  });

  test.each([
    ['no feature', undefined],
    ['features', ['sso', 'licensed']],
  ])('emits valid TypeScript with %s', async (_, licensedFeatures) => {
    const { output } = await generateStrictDefinitions({
      strapi: strapiWith(licensedFeatures === undefined ? {} : { licensedFeatures }),
    });

    const { diagnostics } = ts.transpileModule(output, {
      fileName: 'strict.ts',
      reportDiagnostics: true,
    });
    expect(diagnostics).toEqual([]);
  });

  test.each([
    ['a single name', 'review-workflows'],
    ['null', null],
    ['a name that is not a string', ['sso', 1]],
  ])('rejects %s', async (_, licensedFeatures) => {
    await expect(
      generateStrictDefinitions({ strapi: strapiWith({ licensedFeatures }) })
    ).rejects.toThrow('Invalid config.typescript.licensedFeatures value');
  });
});
