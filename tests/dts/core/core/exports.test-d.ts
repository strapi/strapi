import { describe, expectTypeOf, test } from 'vitest';
import type { Core } from '@strapi/types';
import type * as StrapiCore from '@strapi/core';
import { ai, compileStrapi, createStrapi, factories } from '@strapi/core';

describe('@strapi/core exports', () => {
  test('exposes exactly the public entry points', () => {
    expectTypeOf<keyof typeof StrapiCore>().toEqualTypeOf<
      'createStrapi' | 'compileStrapi' | 'factories' | 'ai'
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
