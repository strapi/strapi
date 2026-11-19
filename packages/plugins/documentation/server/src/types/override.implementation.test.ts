// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type createService from '../services/override';
import type { Equal, Expect } from './assert.test';
import type { OverrideService } from './services';

type Implementation = ReturnType<typeof createService>;
type ImplementationParameters = Parameters<Implementation['registerOverride']>;
type ContractParameters = Parameters<OverrideService['registerOverride']>;

export type OverrideImplementationAssertions = [
  Core.Assert<Core.SameNames<keyof Implementation, keyof OverrideService>>,
  Expect<Equal<ImplementationParameters[0], ContractParameters[0]>>,
  // The implementation still requires `opts.pluginOrigin`, which the contract and the runtime
  // (`override.vitest.test.ts`) leave optional. Its develop annotation is kept, so the strict-off
  // declarations stay unchanged.
  Expect<
    Equal<
      ImplementationParameters[1],
      { pluginOrigin: string; excludeFromGeneration?: string[] } | undefined
    >
  >,
];
