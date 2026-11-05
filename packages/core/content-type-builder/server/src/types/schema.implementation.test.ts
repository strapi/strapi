// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { formatAttribute } from '../services/schema';
import type { Equal, Expect } from './assert.test';
import type { SchemaService } from './services';

type FormatAttributeParameter = Parameters<typeof formatAttribute>[0];
type IsAny<T> = 0 extends 1 & T ? true : false;

// With strict types, `formatAttribute` accepts the contract's attribute, read with the optional
// inverse names of non-morph relations, and no `any`.
export type SchemaImplementationAssertions = [
  Expect<
    Equal<
      FormatAttributeParameter,
      Parameters<SchemaService['formatAttribute']>[0] & { inversedBy?: string; mappedBy?: string }
    >
  >,
  Expect<
    Parameters<SchemaService['formatAttribute']>[0] extends FormatAttributeParameter ? true : false
  >,
  Expect<Equal<IsAny<FormatAttributeParameter[keyof FormatAttributeParameter]>, false>>,
];
