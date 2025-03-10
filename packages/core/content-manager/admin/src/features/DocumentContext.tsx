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
   * Query params object
   * i.e. { locale: 'fr' }
   */
  params?: Record<string, string | string[] | null>;
}

interface DocumentContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  rootDocumentMeta: DocumentMeta;
  document: ReturnType<UseDocument>;
  currentDocumentMeta: DocumentMeta;
}

const [DocumentProvider, useDocumentContext] =
  createContext<DocumentContextValue>('DocumentContext');

interface State {
  documentHistory: DocumentMeta[];
  confirmDialogIntent: null | 'back' | 'open' | 'navigate';
  // TODO: remove this boolean and rely on the confirmDialogIntent to display the dialog or not
  isConfirmDialogOpen: boolean;
  isModalOpen: boolean;
}

type Action =
  | {
      type: 'GO_TO_RELATION';
      payload: {
        document: DocumentMeta;
        hasUnsavedChanges: boolean;
      };
    }
  | {
      type: 'GO_BACK';
      payload: { hasUnsavedChanges: boolean };
    }
  | {
      type: 'GO_FULL_PAGE';
      payload: { hasUnsavedChanges: boolean };
    }
  | {
      type: 'CANCEL_CONFIRM_DIALOG';
    }
  | {
      type: 'CLOSE_MODAL';
      payload: { hasUnsavedChanges: boolean };
    };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GO_TO_RELATION':
      if (action.payload.hasUnsavedChanges) {
        return { ...state, confirmDialogIntent: 'open' };
      }

      return {
        ...state,
        documentHistory: [...state.documentHistory, action.payload.document],
        confirmDialogIntent: null,
        isConfirmDialogOpen: false,
        isModalOpen: true,
      };
    case 'GO_BACK':
      if (action.payload.hasUnsavedChanges) {
        return { ...state, confirmDialogIntent: 'back' };
      }

      return {
        ...state,
        documentHistory: state.documentHistory.slice(0, state.documentHistory.length - 1),
        confirmDialogIntent: null,
      };
    case 'GO_FULL_PAGE':
      if (action.payload.hasUnsavedChanges) {
        return { ...state, confirmDialogIntent: 'navigate', isConfirmDialogOpen: true };
      }

      return {
        ...state,
        confirmDialogIntent: null,
      };
    case 'CANCEL_CONFIRM_DIALOG':
      return {
        ...state,
        confirmDialogIntent: null,
        isConfirmDialogOpen: false,
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        documentHistory: [],
        confirmDialogIntent: null,
        isConfirmDialogOpen: false,
        isModalOpen: false,
      };
    default:
      return state;
  }
}

/**
 * TODO: Document in contributor docs, Add unit test
 */
const DocumentContextProvider = ({
  children,
  initialDocument,
}: {
  children: React.ReactNode | React.ReactNode[];
  initialDocument: DocumentMeta;
}) => {
  /**
   * The reducer manages all the dynamic data of the context.
   * Everything else in the context provider is derived from this state.
   */
  const [state, dispatch] = React.useReducer(reducer, {
    documentHistory: [],
    confirmDialogIntent: null,
    isConfirmDialogOpen: false,
    isModalOpen: false,
  });

  const currentDocumentMeta = state.documentHistory.at(-1) ?? initialDocument;

  const params = React.useMemo(
    () => buildValidParams(currentDocumentMeta.params ?? {}),
    [currentDocumentMeta.params]
  );
  const document = useDocument({ ...currentDocumentMeta, params });

  const rootDocumentMeta = {
    documentId: initialDocument.documentId,
    model: initialDocument.model,
    collectionType: initialDocument.collectionType,
    params: initialDocument.params,
  } satisfies DocumentMeta;

  return (
    <DocumentProvider
      state={state}
      dispatch={dispatch}
      document={document}
      rootDocumentMeta={rootDocumentMeta}
      currentDocumentMeta={currentDocumentMeta}
    >
      {children}
    </DocumentProvider>
  );
};

export { useDocumentContext, DocumentContextProvider };
export type { DocumentMeta };
