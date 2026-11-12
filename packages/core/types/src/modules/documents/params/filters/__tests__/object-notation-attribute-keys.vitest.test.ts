import { describe, expect, test } from 'vitest';

import { COMPILE_TIMEOUT_MS, compileFixture } from './compile-fixture.test.utils';

describe('Filters.ObjectNotation attribute keys', () => {
  test(
    'rejects unknown attributes for schemas with only scalar or only nested attributes',
    () => {
      const { status, signal, output } = compileFixture('known-schema-keys');

      // Each accepted unknown attribute leaves an unused `@ts-expect-error`, which fails the compilation
      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
    },
    COMPILE_TIMEOUT_MS + 10_000
  );

  test(
    'rejects the same shapes without strictNullChecks',
    () => {
      // Apps created before v5.50.0, and configs that extend
      // `@strapi/typescript-utils/tsconfigs/server.json`, have `strict: false`
      const { status, signal, output } = compileFixture('known-schema-keys', [
        '--strictNullChecks',
        'false',
      ]);

      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
    },
    COMPILE_TIMEOUT_MS + 10_000
  );

  test(
    'rejects the same shapes with exactOptionalPropertyTypes',
    () => {
      const { status, signal, output } = compileFixture('known-schema-keys', [
        '--exactOptionalPropertyTypes',
        'true',
      ]);

      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
    },
    COMPILE_TIMEOUT_MS + 10_000
  );

  test.each([[[]], [['--strictNullChecks', 'false']], [['--exactOptionalPropertyTypes', 'true']]])(
    'accepts a spread of a nested component filter (%j)',
    (compilerArgs) => {
      const { status, signal, output } = compileFixture('component-spread', compilerArgs);

      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
    },
    COMPILE_TIMEOUT_MS + 10_000
  );

  test(
    'accepts any attribute when the schema registries are not extended',
    () => {
      const { status, signal, output } = compileFixture('no-schema-registry');

      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
    },
    COMPILE_TIMEOUT_MS + 10_000
  );
});
