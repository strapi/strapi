import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';

import { useDocument, type UseDocument } from '../hooks/useDocument';
import { buildValidParams } from '../utils/api';

interface DocumentMeta {
  /**
   * The equivalent of the ":id" url param value
   * i.e. gus5a67jcboa3o2zjnz39mb1
   */
  documentId: string;
  /**
   * The equivalent of the url ":slug" param value
   * i.e. api::articles.article
   */
  model: string;
  /**
   * The equivalent of the url ":collectionType" param value
   * i.e. collection-types or single-types
   */
  collectionType: string;
  /**
   * The parsed query params
   * i.e. ?i18n=en parsed to { i18n: 'en' }
   */
  params?: Record<string, string>;
}

interface DocumentContextValue {
  rootDocumentMeta: DocumentMeta;
  document: ReturnType<UseDocument>;
  meta: DocumentMeta;
  changeDocument: (newRelation: DocumentMeta) => void;
}

const [DocumentProvider, useDocumentContext] =
  createContext<DocumentContextValue>('DocumentContext');

/**
 * TODO: Document in contributor docs, Add unit test
 *
 * This context provider and its associated hook are used to access a document at its root level
 * and expose a function to change the current document being viewed to one of the root level docuemnt's relations.
 *
 * The useDocumentContext hook exposes:
 * - meta: information about the currentDocument,
 * - document: the actual document,
 * - changeDocument: a function to change the current document to one of its relations.
 */
const DocumentContextProvider = ({
  children,
  initialDocument,
}: {
  children: React.ReactNode | React.ReactNode[];
  initialDocument: DocumentMeta;
}) => {
  /**
   * Initialize with the "root" document and expose a setter method to change to
   * one of the root level document's relations.
   */
  const [currentDocumentMeta, changeDocument] = React.useState<DocumentMeta>(initialDocument);
  const params = React.useMemo(
    () => buildValidParams(currentDocumentMeta.params ?? {}),
    [currentDocumentMeta.params]
  );
  const document = useDocument({ ...currentDocumentMeta, params });

  return (
    <DocumentProvider
      changeDocument={changeDocument}
      document={document}
      rootDocumentMeta={{
        documentId: initialDocument.documentId,
        model: initialDocument.model,
        collectionType: initialDocument.collectionType,
        params: initialDocument.params,
      }}
      meta={currentDocumentMeta}
    >
      {children}
    </DocumentProvider>
  );
};

export { DocumentContextProvider, useDocumentContext };
export type { DocumentMeta };
