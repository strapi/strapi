// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type { Equal, Expect } from './assert.test';
import type { ContentTypeHandler, ContentTypesService } from './services';
import type * as contentTypes from '../services/content-types';
import type createBuilder from '../services/schema-builder';

type ContentTypes = typeof contentTypes;

// Every export of the module has a contract member, and the reverse.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ContentTypesNames = Core.Assert<
  Core.SameNames<keyof typeof import('../services/content-types'), keyof ContentTypesService>
>;

export type Assertions = [
  Expect<
    Equal<
      Parameters<ContentTypes['formatContentType']>,
      Parameters<ContentTypesService['formatContentType']>
    >
  >,
  Expect<
    Equal<
      Parameters<ContentTypes['createContentTypes']>,
      Parameters<ContentTypesService['createContentTypes']>
    >
  >,
  Expect<Equal<Awaited<ReturnType<ContentTypes['createContentTypes']>>, ContentTypeHandler[]>>,
  Expect<
    Equal<
      Parameters<ContentTypes['createContentType']>[0],
      Parameters<ContentTypesService['createContentType']>[0]
    >
  >,
  // `options` keeps its own annotation, which adds the internal `defaultBuilder`.
  Expect<
    Equal<
      Omit<NonNullable<Parameters<ContentTypes['createContentType']>[1]>, 'defaultBuilder'>,
      Omit<NonNullable<Parameters<ContentTypesService['createContentType']>[1]>, never>
    >
  >,
  Expect<
    Equal<Parameters<ContentTypes['generateAPI']>, Parameters<ContentTypesService['generateAPI']>>
  >,
  Expect<
    Equal<
      Parameters<ContentTypes['assertCanConvertToSingleType']>,
      Parameters<ContentTypesService['assertCanConvertToSingleType']>
    >
  >,
  Expect<
    Equal<
      Parameters<ContentTypes['editContentType']>,
      Parameters<ContentTypesService['editContentType']>
    >
  >,
  // `defaultBuilder` is internal (passed by callers that share one builder), beyond the contract.
  Expect<
    Equal<
      Parameters<ContentTypes['deleteContentType']>[0],
      Parameters<ContentTypesService['deleteContentType']>[0]
    >
  >,
  Expect<
    Equal<
      Parameters<ContentTypes['deleteContentType']>[1],
      ReturnType<typeof createBuilder> | undefined
    >
  >,
];
