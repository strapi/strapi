// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Struct } from '@strapi/types';
import type createDataMapperService from '../services/data-mapper';
import type { Equal, Expect } from './assert.test';
import type { ContentManagerModel, DataMapperService } from './services';

type Implementation = ReturnType<typeof createDataMapperService>;

// With strict types, toContentManagerModel takes both schema kinds, as the contract's constraint.
// Its result has typed attributes: it is assignable to the contract's result at that constraint.
export type DataMapperImplementationAssertions = [
  Expect<
    Equal<
      Parameters<Implementation['toContentManagerModel']>,
      Parameters<DataMapperService['toContentManagerModel']>
    >
  >,
  Expect<
    ReturnType<Implementation['toContentManagerModel']> extends ContentManagerModel<
      Struct.ComponentSchema | Struct.ContentTypeSchema
    >
      ? true
      : false
  >,
];
