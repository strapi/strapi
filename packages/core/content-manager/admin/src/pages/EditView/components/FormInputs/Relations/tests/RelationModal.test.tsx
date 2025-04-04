import { DocumentMeta } from '../../../../../../hooks/useDocumentContext';
import { reducer, type State, type Action } from '../RelationModal';

describe('Document Modal Reducer', () => {
  // Sample documents for testing
  const doc1: DocumentMeta = {
    documentId: 'doc1',
    model: 'api::articles.article',
    collectionType: 'collection-types',
  };
  const doc2: DocumentMeta = {
    documentId: 'doc2',
    model: 'api::products.product',
    collectionType: 'collection-types',
  };
  const doc3: DocumentMeta = {
    documentId: 'doc3',
    model: 'api::categories.category',
    collectionType: 'collection-types',
    params: { locale: 'en' },
  };

  // Initial state for most tests
  const initialState: State = {
    documentHistory: [],
    confirmDialogIntent: null,
    isModalOpen: false,
    hasUnsavedChanges: false,
  };

  // State with history
  const stateWithHistory: State = {
    documentHistory: [doc1, doc2],
    confirmDialogIntent: null,
    isModalOpen: true,
    hasUnsavedChanges: false,
  };

  // State with unsaved changes
  const stateWithUnsavedChanges: State = {
    ...stateWithHistory,
    hasUnsavedChanges: true,
  };

  describe('GO_TO_RELATION action', () => {
    it('should add document to history and open modal when no unsaved changes', () => {
      const action: Action = {
        type: 'GO_TO_RELATION',
        payload: {
          document: doc1,
          shouldBypassConfirmation: false,
        },
      };

      const result = reducer(initialState, action);

      expect(result).toEqual({
        documentHistory: [doc1],
        confirmDialogIntent: null,
        isModalOpen: true,
        hasUnsavedChanges: false,
      });
    });

    it('should add document to existing history', () => {
      const action: Action = {
        type: 'GO_TO_RELATION',
        payload: {
          document: doc3,
          shouldBypassConfirmation: false,
        },
      };

      const result = reducer(stateWithHistory, action);

      expect(result).toEqual({
        documentHistory: [doc1, doc2, doc3],
        confirmDialogIntent: null,
        isModalOpen: true,
        hasUnsavedChanges: false,
      });
    });

    it('should show confirmation dialog when unsaved changes exist', () => {
      const action: Action = {
        type: 'GO_TO_RELATION',
        payload: {
          document: doc3,
          shouldBypassConfirmation: false,
        },
      };

      const result = reducer(stateWithUnsavedChanges, action);

      expect(result).toEqual({
        ...stateWithUnsavedChanges,
        confirmDialogIntent: doc3,
      });
    });

    it('should bypass confirmation when shouldBypassConfirmation is true', () => {
      const action: Action = {
        type: 'GO_TO_RELATION',
        payload: {
          document: doc3,
          shouldBypassConfirmation: true,
        },
      };

      const result = reducer(stateWithUnsavedChanges, action);

      expect(result).toEqual({
        documentHistory: [doc1, doc2, doc3],
        confirmDialogIntent: null,
        isModalOpen: true,
        hasUnsavedChanges: true,
      });
    });
  });

  describe('GO_BACK action', () => {
    it('should remove the last document from history when no unsaved changes', () => {
      const action: Action = {
        type: 'GO_BACK',
        payload: {
          shouldBypassConfirmation: false,
        },
      };

      const result = reducer(stateWithHistory, action);

      expect(result).toEqual({
        documentHistory: [doc1],
        confirmDialogIntent: null,
        isModalOpen: true,
        hasUnsavedChanges: false,
      });
    });

    it('should show confirmation dialog when unsaved changes exist', () => {
      const action: Action = {
        type: 'GO_BACK',
        payload: {
          shouldBypassConfirmation: false,
        },
      };

      const result = reducer(stateWithUnsavedChanges, action);

      expect(result).toEqual({
        ...stateWithUnsavedChanges,
        confirmDialogIntent: 'back',
      });
    });

    it('should bypass confirmation when shouldBypassConfirmation is true', () => {
      const action: Action = {
        type: 'GO_BACK',
        payload: {
          shouldBypassConfirmation: true,
        },
      };

      const result = reducer(stateWithUnsavedChanges, action);

      expect(result).toEqual({
        documentHistory: [doc1],
        confirmDialogIntent: null,
        isModalOpen: true,
        hasUnsavedChanges: true,
      });
    });
  });

  describe('GO_FULL_PAGE action', () => {
    it('should clear confirmDialogIntent when no unsaved changes', () => {
      const action: Action = {
        type: 'GO_FULL_PAGE',
      };

      const result = reducer(stateWithHistory, action);

      expect(result).toEqual(initialState);
    });

    it('should show navigate confirmation dialog when unsaved changes exist', () => {
      const action: Action = {
        type: 'GO_FULL_PAGE',
      };

      const result = reducer(stateWithUnsavedChanges, action);

      expect(result).toEqual({
        ...stateWithUnsavedChanges,
        confirmDialogIntent: 'navigate',
      });
    });
  });

  describe('CANCEL_CONFIRM_DIALOG action', () => {
    it('should clear the confirmation dialog intent', () => {
      const stateWithDialog: State = {
        ...stateWithUnsavedChanges,
        confirmDialogIntent: 'close',
      };

      const action: Action = {
        type: 'CANCEL_CONFIRM_DIALOG',
      };

      const result = reducer(stateWithDialog, action);

      expect(result).toEqual({
        ...stateWithDialog,
        confirmDialogIntent: null,
      });
    });
  });

  describe('CLOSE_MODAL action', () => {
    it('should clear history and close modal when no unsaved changes', () => {
      const action: Action = {
        type: 'CLOSE_MODAL',
        payload: {
          shouldBypassConfirmation: false,
        },
      };

      const result = reducer(stateWithHistory, action);

      expect(result).toEqual({
        documentHistory: [],
        confirmDialogIntent: null,
        isModalOpen: false,
        hasUnsavedChanges: false,
      });
    });

    it('should show close confirmation dialog when unsaved changes exist', () => {
      const action: Action = {
        type: 'CLOSE_MODAL',
        payload: {
          shouldBypassConfirmation: false,
        },
      };

      const result = reducer(stateWithUnsavedChanges, action);

      expect(result).toEqual({
        ...stateWithUnsavedChanges,
        confirmDialogIntent: 'close',
      });
    });

    it('should bypass confirmation when shouldBypassConfirmation is true', () => {
      const action: Action = {
        type: 'CLOSE_MODAL',
        payload: {
          shouldBypassConfirmation: true,
        },
      };

      const result = reducer(stateWithUnsavedChanges, action);

      expect(result).toEqual({
        documentHistory: [],
        confirmDialogIntent: null,
        isModalOpen: false,
        hasUnsavedChanges: false,
      });
    });
  });

  describe('SET_HAS_UNSAVED_CHANGES action', () => {
    it('should set hasUnsavedChanges to true', () => {
      const action: Action = {
        type: 'SET_HAS_UNSAVED_CHANGES',
        payload: {
          hasUnsavedChanges: true,
        },
      };

      const result = reducer(stateWithHistory, action);

      expect(result).toEqual({
        ...stateWithHistory,
        hasUnsavedChanges: true,
      });
    });

    it('should set hasUnsavedChanges to false', () => {
      const action: Action = {
        type: 'SET_HAS_UNSAVED_CHANGES',
        payload: {
          hasUnsavedChanges: false,
        },
      };

      const result = reducer(stateWithUnsavedChanges, action);

      expect(result).toEqual({
        ...stateWithUnsavedChanges,
        hasUnsavedChanges: false,
      });
    });
  });

  describe('Unknown action', () => {
    it('should return the current state for unknown action types', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const action = { type: 'UNKNOWN_ACTION' } as any;
      const result = reducer(stateWithHistory, action);

      expect(result).toBe(stateWithHistory);
    });
  });
});
