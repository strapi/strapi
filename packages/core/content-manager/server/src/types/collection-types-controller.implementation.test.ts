// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Context } from 'koa';
import type controller from '../controllers/collection-types';
import type { Equal, Expect } from './assert.test';

type Controller = typeof controller;
type Ctx<TAction extends keyof Controller> = Parameters<Controller[TAction]>[0];

// With strict types, each action takes the Koa context of its contract, not `any`.
export type CollectionTypesControllerAssertions = [
  Expect<Equal<Ctx<'find'>, Context>>,
  Expect<Equal<Ctx<'findOne'>, Context>>,
  Expect<Equal<Ctx<'create'>, Context>>,
  Expect<Equal<Ctx<'update'>, Context>>,
  Expect<Equal<Ctx<'clone'>, Context>>,
  Expect<Equal<Ctx<'autoClone'>, Context>>,
  Expect<Equal<Ctx<'delete'>, Context>>,
  Expect<Equal<Ctx<'publish'>, Context>>,
  Expect<Equal<Ctx<'bulkFindForValidation'>, Context>>,
  Expect<Equal<Ctx<'bulkPublish'>, Context>>,
  Expect<Equal<Ctx<'bulkUnpublish'>, Context>>,
  Expect<Equal<Ctx<'unpublish'>, Context>>,
  Expect<Equal<Ctx<'discard'>, Context>>,
  Expect<Equal<Ctx<'bulkDelete'>, Context>>,
  Expect<Equal<Ctx<'countDraftRelations'>, Context>>,
  Expect<Equal<Ctx<'countManyEntriesDraftRelations'>, Context>>,
  // `autoClone` calls `clone` with the context alone.
  Expect<[Context] extends Parameters<Controller['clone']> ? true : false>,
];
