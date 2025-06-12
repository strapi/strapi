import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';

import { useDoc, useDocument, type UseDocument } from '../hooks/useDocument';
import { useRelationModal } from '../pages/EditView/components/FormInputs/Relations/RelationModal';
import { buildValidParams } from '../utils/api';

interface DocumentMeta {
  /**
   * The equivalent of the ":id" url param value
   * i.e. gus5a67jcboa3o2zjnz39mb1
   */
  documentId?: string;
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
   * Query params object
   * i.e. { locale: 'fr' }
   */
  params?: Record<string, string | string[] | null>;
}

interface DocumentContextValue {
  currentDocumentMeta: DocumentMeta;
  currentDocument: ReturnType<UseDocument>;
}

function useDocumentContext(consumerName: string): DocumentContextValue {
  // Try to get state from the relation modal context first
  const currentRelationDocumentMeta = useRelationModal(
    consumerName,
    (state) => state.currentDocumentMeta,
    false
  );
  const currentRelationDocument = useRelationModal(
    consumerName,
    (state) => state.currentDocument,
    false
  );

  // Then try to get the same state from the URL
  const { collectionType, model, id: documentId } = useDoc();
  const [{ query }] = useQueryParams();

  // TODO: look into why we never seem to pass any params
  const params = React.useMemo(() => buildValidParams(query ?? {}), [query]);
  const urlDocumentMeta: DocumentMeta = { collectionType, model, documentId: documentId!, params };
  const urlDocument = useDocument(urlDocumentMeta);

  /**
   * If there's modal state, use it in priority as it's the most specific
   * Fallback to the state derived from the URL, which is the default behavior,
   * used for the edit view, history and preview.
   */
  return {
    currentDocumentMeta: currentRelationDocumentMeta ?? urlDocumentMeta,
    currentDocument: currentRelationDocument ?? urlDocument,
  };
}

export { useDocumentContext };
export type { DocumentMeta };
