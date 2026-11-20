// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { DocumentManagerService } from '../services/document-manager';
import type { Equal, Expect } from './assert.test';

type Implementation = ReturnType<DocumentManagerService>;

// With strict types, the clone body carries the request locale: a string, or `undefined` when the
// request sent none or null (`clone-body-locale.test.api.ts`). The tuple keeps the `any` of the
// body's other fields from passing for it.
export type DocumentManagerImplementationAssertions = [
  Expect<Equal<[Parameters<Implementation['clone']>[1]['locale']], [string | undefined]>>,
];
