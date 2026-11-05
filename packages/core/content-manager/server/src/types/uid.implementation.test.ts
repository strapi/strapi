// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createUIDService from '../services/uid';
import type { Equal, Expect } from './assert.test';
import type { UIDService } from './services';

type Implementation = ReturnType<typeof createUIDService>;

// With strict types, generateUIDField resolves to the result of the contract.
export type UIDImplementationAssertions = [
  Expect<
    Equal<
      Awaited<ReturnType<Implementation['generateUIDField']>>,
      Awaited<ReturnType<UIDService['generateUIDField']>>
    >
  >,
];
