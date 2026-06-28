import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';

import type { RelationOpenMode } from '../../../../../../../shared/contracts/content-types';
import type { UseDocument } from '../../../../../hooks/useDocument';
import type { DocumentMeta } from '../../../../../hooks/useDocumentContext';

type State = {
  documentHistory: DocumentMeta[];
  confirmDialogIntent: null | 'close' | 'back' | 'navigate' | DocumentMeta;
  isModalOpen: boolean;
  hasUnsavedChanges: boolean;
  fieldToConnect?: string;
  fieldToConnectUID?: string;
};

type Action =
  | {
      type: 'GO_TO_RELATION';
      payload: {
        document: DocumentMeta;
        shouldBypassConfirmation: boolean;
        fieldToConnect?: string;
        fieldToConnectUID?: string;
      };
    }
  | {
      type: 'GO_BACK';
      payload: { shouldBypassConfirmation: boolean };
    }
  | {
      type: 'GO_FULL_PAGE';
    }
  | {
      type: 'GO_TO_CREATED_RELATION';
      payload: {
        document: DocumentMeta;
        shouldBypassConfirmation: boolean;
        fieldToConnect?: string;
        fieldToConnectUID?: string;
      };
    }
  | {
      type: 'CANCEL_CONFIRM_DIALOG';
    }
  | {
      type: 'CLOSE_MODAL';
      payload: { shouldBypassConfirmation: boolean };
    }
  | {
      type: 'SET_HAS_UNSAVED_CHANGES';
      payload: { hasUnsavedChanges: boolean };
    };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GO_TO_RELATION':
      if (state.hasUnsavedChanges && !action.payload.shouldBypassConfirmation) {
        return {
          ...state,
          confirmDialogIntent: action.payload.document,
          fieldToConnect: action.payload.fieldToConnect,
          fieldToConnectUID: action.payload.fieldToConnectUID,
        };
      }

      const lastItemDocumentHistory = state.documentHistory.at(-1);
      const hasToResetDocumentHistory =
        lastItemDocumentHistory && !lastItemDocumentHistory.documentId;
      return {
        ...state,
        documentHistory: hasToResetDocumentHistory
          ? [action.payload.document]
          : [...state.documentHistory, action.payload.document],
        confirmDialogIntent: null,
        isModalOpen: true,
        fieldToConnect: hasToResetDocumentHistory ? undefined : action.payload.fieldToConnect,
        fieldToConnectUID: hasToResetDocumentHistory ? undefined : action.payload.fieldToConnectUID,
      };
    case 'GO_BACK':
      if (state.hasUnsavedChanges && !action.payload.shouldBypassConfirmation) {
        return { ...state, confirmDialogIntent: 'back' };
      }

      return {
        ...state,
        documentHistory: state.documentHistory.slice(0, -1),
        confirmDialogIntent: null,
      };
    case 'GO_FULL_PAGE':
      if (state.hasUnsavedChanges) {
        return { ...state, confirmDialogIntent: 'navigate' };
      }

      return {
        ...state,
        documentHistory: [],
        hasUnsavedChanges: false,
        isModalOpen: false,
        confirmDialogIntent: null,
      };
    case 'GO_TO_CREATED_RELATION':
      return {
        ...state,
        documentHistory: state.documentHistory
          ? [...state.documentHistory.slice(0, -1), action.payload.document]
          : [action.payload.document],
        confirmDialogIntent: null,
        isModalOpen: true,
        fieldToConnect: undefined,
        fieldToConnectUID: undefined,
      };
    case 'CANCEL_CONFIRM_DIALOG':
      return {
        ...state,
        confirmDialogIntent: null,
      };
    case 'CLOSE_MODAL':
      if (state.hasUnsavedChanges && !action.payload.shouldBypassConfirmation) {
        return { ...state, confirmDialogIntent: 'close' };
      }

      return {
        ...state,
        documentHistory: [],
        confirmDialogIntent: null,
        hasUnsavedChanges: false,
        isModalOpen: false,
      };
    case 'SET_HAS_UNSAVED_CHANGES':
      return {
        ...state,
        hasUnsavedChanges: action.payload.hasUnsavedChanges,
      };
    default:
      return state;
  }
}

type RelationModalContextValue = {
  state: State;
  dispatch: React.Dispatch<Action>;
  rootDocumentMeta: DocumentMeta;
  currentDocumentMeta: DocumentMeta;
  currentDocument: ReturnType<UseDocument>;
  onPreview?: () => void;
  isCreating: boolean;
  relationOpenMode: RelationOpenMode;
};

const [RelationModalProvider, useRelationModal] =
  createContext<RelationModalContextValue>('RelationModal');

export { reducer, RelationModalProvider, useRelationModal };
export type { Action, RelationOpenMode, State };
