// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Equal, Expect } from './assert.test';
import type { FieldSizesService } from './services';
import type fieldSizes from '../services/field-sizes';

type FieldSizes = ReturnType<typeof fieldSizes>;

export type Assertions = [
  Expect<
    Equal<
      ReturnType<FieldSizes['getAllFieldSizes']>,
      ReturnType<FieldSizesService['getAllFieldSizes']>
    >
  >,
];
