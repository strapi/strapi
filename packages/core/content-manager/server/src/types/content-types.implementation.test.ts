// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Equal, Expect } from './assert.test';
import type { ContentTypesService } from './services';
import type createContentTypesService from '../services/content-types';

type ContentTypes = ReturnType<typeof createContentTypesService>;

type FindConfigurationResult = Awaited<ReturnType<ContentTypes['findConfiguration']>>;
type ContractFindConfigurationResult = Awaited<
  ReturnType<ContentTypesService['findConfiguration']>
>;

// With strict types, the results the implementation writes through gates are the contract's.
// findConfiguration spreads the stored configuration into an object literal: its result has the
// contract's members as one object type, not as the contract's intersection.
export type Assertions = [
  Expect<FindConfigurationResult extends ContractFindConfigurationResult ? true : false>,
  Expect<ContractFindConfigurationResult extends FindConfigurationResult ? true : false>,
  Expect<Equal<FindConfigurationResult['uid'], ContractFindConfigurationResult['uid']>>,
  Expect<
    Equal<
      Awaited<ReturnType<ContentTypes['updateConfiguration']>>,
      Awaited<ReturnType<ContentTypesService['updateConfiguration']>>
    >
  >,
  Expect<
    Equal<
      ReturnType<ContentTypes['findDisplayedContentTypes']>,
      ReturnType<ContentTypesService['findDisplayedContentTypes']>
    >
  >,
  Expect<
    Equal<
      ReturnType<ContentTypes['findContentTypesByKind']>,
      ReturnType<ContentTypesService['findContentTypesByKind']>
    >
  >,
];
