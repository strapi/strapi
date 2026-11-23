// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Context } from 'koa';
import type controller from '../controllers/single-types';
import type { Equal, Expect } from './assert.test';

// With strict types, each action takes the Koa context of its contract, not `any`.
export type SingleTypesControllerAssertions = [
  Expect<Equal<Parameters<typeof controller.find>[0], Context>>,
  Expect<Equal<Parameters<typeof controller.createOrUpdate>[0], Context>>,
  Expect<Equal<Parameters<typeof controller.delete>[0], Context>>,
  Expect<Equal<Parameters<typeof controller.publish>[0], Context>>,
  Expect<Equal<Parameters<typeof controller.unpublish>[0], Context>>,
  Expect<Equal<Parameters<typeof controller.discard>[0], Context>>,
  Expect<Equal<Parameters<typeof controller.countDraftRelations>[0], Context>>,
];
