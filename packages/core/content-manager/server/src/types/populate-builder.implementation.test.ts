// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createPopulateBuilder from '../services/populate-builder';
import type { Equal, Expect } from './assert.test';
import type { PopulateBuilder } from './services';

type Implementation = ReturnType<ReturnType<typeof createPopulateBuilder>>;

// With strict types, build resolves to the result of the contract, and withPopulateOverride
// takes the parameter of the contract.
export type PopulateBuilderImplementationAssertions = [
  Expect<
    Equal<
      Awaited<ReturnType<Implementation['build']>>,
      Awaited<ReturnType<PopulateBuilder['build']>>
    >
  >,
  Expect<
    Equal<
      Parameters<Implementation['withPopulateOverride']>,
      Parameters<PopulateBuilder['withPopulateOverride']>
    >
  >,
];
