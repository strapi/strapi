// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Context, Next } from 'koa';
import type { Struct } from '@strapi/types';
import type { Equal, Expect } from './assert.test';
import type {
  CollectionTypesController,
  ContentTypesController,
  RelationsController,
} from './controllers';

// `autoClone` calls `clone` without `next`; the router calls it with `next`.
export type CloneParameters = Expect<
  Equal<Parameters<CollectionTypesController['clone']>, [context: Context, next?: Next]>
>;

// The query `findContentTypes` reads is the one its validator accepts.
export type FindContentTypesKind = Expect<
  Equal<
    Parameters<ContentTypesController['findContentTypes']>[0]['query']['kind'],
    Struct.ContentTypeKind | undefined
  >
>;

// The query `findAvailable` reads is the one its validator accepts, as raw router strings.
export type FindAvailableIdsToOmit = Expect<
  Equal<
    Parameters<RelationsController['findAvailable']>[0]['request']['query']['idsToOmit'],
    string[] | undefined
  >
>;

// A router context still reaches the three actions, so app code that forwards one compiles.
declare const ctx: Context;
declare const next: Next;
declare const collectionTypes: CollectionTypesController;
declare const contentTypes: ContentTypesController;
declare const relations: RelationsController;

collectionTypes.clone(ctx);
collectionTypes.clone(ctx, next);
contentTypes.findContentTypes(ctx, next);
relations.findAvailable(ctx, next);
