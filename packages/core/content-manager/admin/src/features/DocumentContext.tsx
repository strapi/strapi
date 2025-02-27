import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';

import { useDocument, type UseDocument } from '../hooks/useDocument';

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
}

interface DocumentContextValue {
  document: ReturnType<UseDocument>;
  meta: DocumentMeta;
  changeDocument: (newRelation: DocumentMeta) => void;
  backButtonHistory: DocumentMeta[];
  addDocumentToHistory: (document: DocumentMeta) => void;
  removeDocumentFromHistory: () => DocumentMeta;
  resetHistory: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
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
  const document = useDocument(currentDocumentMeta);
  const [backButtonHistory, setBackButtonHistory] = React.useState<DocumentMeta[]>([]);

  // Handlers to add, remove and reset back button history
  const addDocumentToHistory = (document: DocumentMeta) => {
    setBackButtonHistory((prev) => [...prev, document]);
  };
  const removeDocumentFromHistory = () => {
    const lastDocument = backButtonHistory[backButtonHistory.length - 1];
    setBackButtonHistory((prev) => prev.slice(0, prev.length - 1));
    return lastDocument;
  };
  const resetHistory = () => {
    setBackButtonHistory([]);
  };
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <DocumentProvider
      changeDocument={changeDocument}
      document={document}
      meta={currentDocumentMeta}
      backButtonHistory={backButtonHistory}
      addDocumentToHistory={addDocumentToHistory}
      removeDocumentFromHistory={removeDocumentFromHistory}
      resetHistory={resetHistory}
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
    >
      {children}
    </DocumentProvider>
  );
};

export { DocumentContextProvider, useDocumentContext };
export type { DocumentMeta };
