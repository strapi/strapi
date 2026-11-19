import * as ts from 'typescript';

import { generateStrictDefinitions } from '../../../generators/strict';
import { createLogger } from '../../../generators/utils';

/**
 * The license that verified at boot, as `strapi.ee` exposes it: `undefined` boots without a license
 * (CE), an array of feature names boots with a license listing them.
 */
type BootLicense = string[] | undefined;

// A Strapi instance whose `typescript` config holds `typescript`, booted with `license`.
const strapiWith = (
  typescript: Record<string, unknown> = {},
  license: BootLicense = undefined
) => ({
  config: {
    get(path: string, fallback?: unknown) {
      const [namespace, key] = path.split('.');
      return namespace === 'typescript' && key !== undefined && Object.hasOwn(typescript, key)
        ? typescript[key]
        : fallback;
    },
  },
  ee: {
    isEE: license !== undefined,
    features: {
      list: () => (license ?? []).map((name) => ({ name })),
    },
  },
});

const silentLogger = () => createLogger({ silent: true });

const generate = (strapi: ReturnType<typeof strapiWith>) =>
  generateStrictDefinitions({ strapi, logger: silentLogger() });

describe('generateStrictDefinitions', () => {
  test('emits the type-only opt-in to strict server contracts through @strapi/strapi', async () => {
    const { output } = await generate(strapiWith());

    expect(output).toContain("import type {} from '@strapi/strapi/strict-types';");
    // must not reach into @strapi/types or a plugin directly: the app does not depend on them
    expect(output).not.toContain('@strapi/types');
    expect(output).not.toContain('strapi-server');
  });

  test('declares the license scope with no licensed feature when `licensedFeatures` is unset', async () => {
    const { output } = await generate(strapiWith());

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
    const { output } = await generate(
      strapiWith({ licensedFeatures: ['review-workflows', 'licensed', 'review-workflows'] })
    );

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
    const { output } = await generate(
      strapiWith(licensedFeatures === undefined ? {} : { licensedFeatures })
    );

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
    await expect(generate(strapiWith({ licensedFeatures }))).rejects.toThrow(
      'Invalid config.typescript.licensedFeatures value'
    );
  });

  describe('compares `licensedFeatures` with the license that verified at boot', () => {
    const warningsOf = async (licensedFeatures: string[] | undefined, license: BootLicense) => {
      const logger = silentLogger();
      const warn = jest.spyOn(logger, 'warn');
      const typescript = licensedFeatures === undefined ? {} : { licensedFeatures };

      const { output } = await generateStrictDefinitions({
        strapi: strapiWith(typescript, license),
        logger,
      });

      return { warnings: warn.mock.calls.map((args) => args.join(' ')), output };
    };

    test.each([
      ['CE, nothing listed', undefined, undefined],
      ['the license features, listed', ['sso', 'audit-logs'], ['audit-logs', 'sso']],
      ['a license with no feature, `licensed` listed', ['licensed'], []],
    ])('does not warn with %s', async (_, licensedFeatures, license) => {
      const { warnings } = await warningsOf(licensedFeatures, license);

      expect(warnings).toEqual([]);
    });

    test('warns once with the license features the config does not list', async () => {
      const { warnings } = await warningsOf(['sso'], ['sso', 'audit-logs', 'review-workflows']);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('typescript.licensedFeatures');
      expect(warnings[0]).toContain('audit-logs, review-workflows');
      expect(warnings[0]).not.toContain('sso');
    });

    test('warns that `licensed` is not listed when a license with no feature verified', async () => {
      const { warnings } = await warningsOf(undefined, []);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('does not list: licensed.');
    });

    test('warns once with the listed features the license does not include', async () => {
      const { warnings } = await warningsOf(['sso', 'audit-logs', 'licensed'], ['sso']);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('typescript.licensedFeatures');
      expect(warnings[0]).toContain('audit-logs');
      expect(warnings[0]).not.toContain('sso');
    });

    test('warns that every listed feature is missing in CE', async () => {
      const { warnings } = await warningsOf(['review-workflows', 'licensed'], undefined);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('review-workflows, licensed');
    });

    test('warns in both directions at once', async () => {
      const { warnings } = await warningsOf(['sso'], ['audit-logs']);

      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toContain('audit-logs');
      expect(warnings[1]).toContain('sso');
    });

    test('writes the license scope from the config, whatever the license', async () => {
      const fromConfig = await warningsOf(['sso'], undefined);
      const withLicense = await warningsOf(['sso'], ['audit-logs', 'review-workflows']);

      expect(withLicense.output).toBe(fromConfig.output);
    });
  });
});
