// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type upload from '../services/upload';
import type { Equal, Expect } from './assert.test';
import type { UploadService } from './services';

type UploadImplementation = ReturnType<typeof upload>;

// The gated query parameters take the contract's types in the strict program, not `any`.
export type QueryParameters = [
  Expect<
    Equal<Parameters<UploadImplementation['findMany']>, Parameters<UploadService['findMany']>>
  >,
  Expect<
    Equal<Parameters<UploadImplementation['findPage']>, Parameters<UploadService['findPage']>>
  >,
  Expect<
    Equal<
      Parameters<UploadImplementation['findAndCountPage']>,
      Parameters<UploadService['findAndCountPage']>
    >
  >,
];
