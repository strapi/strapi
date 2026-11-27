// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Equal, Expect } from './assert.test';
import type { DocumentMetadataService } from './services';
import type documentMetadata from '../services/document-metadata';

type DocumentMetadata = ReturnType<typeof documentMetadata>;

export type Assertions = [
  Expect<
    Equal<
      Parameters<DocumentMetadata['getAvailableLocales']>,
      Parameters<DocumentMetadataService['getAvailableLocales']>
    >
  >,
  Expect<
    Equal<
      ReturnType<DocumentMetadata['getAvailableLocales']>,
      ReturnType<DocumentMetadataService['getAvailableLocales']>
    >
  >,
  Expect<
    Equal<
      Parameters<DocumentMetadata['getAvailableStatus']>,
      Parameters<DocumentMetadataService['getAvailableStatus']>
    >
  >,
  Expect<
    Equal<
      Parameters<DocumentMetadata['getManyAvailableStatus']>,
      Parameters<DocumentMetadataService['getManyAvailableStatus']>
    >
  >,
  Expect<
    Equal<
      ReturnType<DocumentMetadata['getStatus']>,
      ReturnType<DocumentMetadataService['getStatus']>
    >
  >,
  Expect<
    Equal<
      Parameters<DocumentMetadata['getMetadata']>,
      Parameters<DocumentMetadataService['getMetadata']>
    >
  >,
  // Not tied: the contract is generic over the document, the implementation is not. The
  // parameters and the result read at the contract's constraint.
  Expect<
    Equal<
      Parameters<DocumentMetadata['formatDocumentWithMetadata']>,
      Parameters<DocumentMetadataService['formatDocumentWithMetadata']>
    >
  >,
  Expect<
    Equal<
      ReturnType<DocumentMetadata['formatDocumentWithMetadata']>,
      ReturnType<DocumentMetadataService['formatDocumentWithMetadata']>
    >
  >,
];
