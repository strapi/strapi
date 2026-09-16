import { describe, expectTypeOf, test } from 'vitest';
import type * as Strapi from '@strapi/strapi';
import { ai, compileStrapi, createStrapi, factories, type Core } from '@strapi/strapi';

describe('@strapi/strapi exports', () => {
  test('exposes exactly the public entry points', () => {
    // Augmenting the `Public` registries, as generated application types do, adds a key named after
    // the quoted absolute path of the augmented module to the namespace type
    type ModulePathKey = `"${string}"`;

    expectTypeOf<Exclude<keyof typeof Strapi, ModulePathKey>>().toEqualTypeOf<
      | 'createStrapi'
      | 'compileStrapi'
      | 'factories'
      | 'ai'
      // Wrong: `dist/index.mjs` has no default export, but the `import` condition shares the
      // CommonJS declarations, so ESM consumers see one (https://github.com/strapi/strapi/issues/27686)
      | 'default'
    >();
  });

  test('factories exposes exactly the core API factories', () => {
    expectTypeOf<keyof typeof factories>().toEqualTypeOf<
      | 'createCoreController'
      | 'createCoreService'
      | 'createCoreRouter'
      | 'createCoreValidator'
      | 'isCustomController'
    >();
  });

  test('ai exposes the MCP definition helpers', () => {
    expectTypeOf<keyof typeof ai>().toEqualTypeOf<'mcp'>();
    expectTypeOf<keyof typeof ai.mcp>().toEqualTypeOf<
      'defineTool' | 'defineResource' | 'definePrompt'
    >();
  });
});

describe('createStrapi', () => {
  test('returns a Strapi instance', () => {
    // `toEqualTypeOf` passes when the actual type is `any`, so guard against it first
    expectTypeOf(createStrapi).returns.not.toBeAny();
    expectTypeOf(createStrapi).returns.toEqualTypeOf<Core.Strapi>();
    expectTypeOf<Core.Strapi['documents']>().not.toBeAny();
    expectTypeOf<Core.Strapi['server']>().not.toBeAny();
  });

  test('accepts optional, partial options', () => {
    expectTypeOf(createStrapi).toBeCallableWith();
    expectTypeOf(createStrapi).toBeCallableWith({});
    expectTypeOf(createStrapi).toBeCallableWith({ appDir: '/app' });
    expectTypeOf(createStrapi).toBeCallableWith({
      appDir: '/app',
      distDir: '/app/dist',
      autoReload: true,
      serveAdminPanel: false,
    });
  });

  test('rejects invalid options', () => {
    // @ts-expect-error unknown option
    expectTypeOf(createStrapi).toBeCallableWith({ unknownOption: true });
    // @ts-expect-error appDir must be a string
    expectTypeOf(createStrapi).toBeCallableWith({ appDir: 1 });
  });
});

describe('compileStrapi', () => {
  test('accepts optional options', () => {
    expectTypeOf(compileStrapi).toBeCallableWith();
    expectTypeOf(compileStrapi).toBeCallableWith({ appDir: '/app', ignoreDiagnostics: true });
    // @ts-expect-error unknown option
    expectTypeOf(compileStrapi).toBeCallableWith({ distDir: '/app/dist' });
  });

  test('resolves to the compiled directories', () => {
    expectTypeOf(compileStrapi).returns.resolves.toEqualTypeOf<{
      appDir: string;
      distDir: string | undefined;
    }>();
  });
});
