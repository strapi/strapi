import { DocumentMeta } from '../../../../../../hooks/useDocumentContext';
import {
  reducer,
  prefillParentRelation,
  type State,
  type Action,
  type PendingConnectPatch,
} from '../RelationModal';

import type { AnyData } from '../../../../utils/data';

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
    pendingConnects: {},
  };

  // State with history
  const stateWithHistory: State = {
    documentHistory: [doc1, doc2],
    confirmDialogIntent: null,
    isModalOpen: true,
    hasUnsavedChanges: false,
    pendingConnects: {},
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
        pendingConnects: {},
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
        pendingConnects: {},
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
        pendingConnects: {},
      });
    });

    it('should retain the parent form accessor while creating a relation', () => {
      const getParentFormValues = () => ({ title: 'Unsaved parent title' });
      const action: Action = {
        type: 'GO_TO_RELATION',
        payload: {
          document: doc1,
          shouldBypassConfirmation: false,
          fieldToConnect: 'products',
          getParentFormValues,
        },
      };

      const result = reducer(initialState, action);

      expect(result.getParentFormValues).toBe(getParentFormValues);
      expect(result.fieldToConnect).toBe('products');
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
        pendingConnects: {},
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
        pendingConnects: {},
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
        pendingConnects: {},
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
        pendingConnects: {},
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

  describe('GO_TO_CREATED_RELATION action', () => {
    it('does not record a pending connect when the parent is the root document (history has fewer than 2 entries)', () => {
      const stateWithOneEntry: State = {
        ...initialState,
        documentHistory: [doc2],
      };
      const connectPatch: PendingConnectPatch = {
        fieldToConnect: 'products',
        relationValue: { connect: [{ id: 1 }], disconnect: [] },
      };
      const action: Action = {
        type: 'GO_TO_CREATED_RELATION',
        payload: { document: doc2, shouldBypassConfirmation: true, connectPatch },
      };

      const result = reducer(stateWithOneEntry, action);

      expect(result.pendingConnects).toEqual({});
    });

    it('records a pending connect for the nested parent when history has 2 or more entries', () => {
      const stateWithTwoEntries: State = {
        ...initialState,
        documentHistory: [doc1, doc2],
      };
      const connectPatch: PendingConnectPatch = {
        fieldToConnect: 'products',
        relationValue: { connect: [{ id: 1 }], disconnect: [] },
      };
      const action: Action = {
        type: 'GO_TO_CREATED_RELATION',
        payload: { document: doc2, shouldBypassConfirmation: true, connectPatch },
      };

      const result = reducer(stateWithTwoEntries, action);

      expect(result.pendingConnects).toEqual({
        'api::articles.article::doc1': [connectPatch],
      });
    });

    it('appends to any existing pending connects recorded for the same nested parent', () => {
      const existingPatch: PendingConnectPatch = {
        fieldToConnect: 'addresses',
        relationValue: { connect: [{ id: 2 }], disconnect: [] },
      };
      const stateWithPending: State = {
        ...initialState,
        documentHistory: [doc1, doc2],
        pendingConnects: { 'api::articles.article::doc1': [existingPatch] },
      };
      const newPatch: PendingConnectPatch = {
        fieldToConnect: 'products',
        relationValue: { connect: [{ id: 1 }], disconnect: [] },
      };
      const action: Action = {
        type: 'GO_TO_CREATED_RELATION',
        payload: { document: doc2, shouldBypassConfirmation: true, connectPatch: newPatch },
      };

      const result = reducer(stateWithPending, action);

      expect(result.pendingConnects).toEqual({
        'api::articles.article::doc1': [existingPatch, newPatch],
      });
    });

    it('replaces the last history entry and resets the connect-trigger fields', () => {
      const stateBefore: State = {
        ...initialState,
        documentHistory: [doc1],
        fieldToConnect: 'products',
        fieldToConnectUID: 'some.uid',
        getParentFormValues: () => ({}),
        setParentFormValue: () => {},
      };
      const action: Action = {
        type: 'GO_TO_CREATED_RELATION',
        payload: { document: doc2, shouldBypassConfirmation: true },
      };

      const result = reducer(stateBefore, action);

      expect(result.documentHistory).toEqual([doc2]);
      expect(result.fieldToConnect).toBeUndefined();
      expect(result.fieldToConnectUID).toBeUndefined();
      expect(result.getParentFormValues).toBeUndefined();
      expect(result.setParentFormValue).toBeUndefined();
    });
  });

  describe('CLEAR_PENDING_CONNECTS action', () => {
    it('removes pending connects recorded for the given document, leaving others untouched', () => {
      const patch: PendingConnectPatch = {
        fieldToConnect: 'products',
        relationValue: { connect: [{ id: 1 }], disconnect: [] },
      };
      const stateWithPending: State = {
        ...initialState,
        pendingConnects: {
          'api::articles.article::doc1': [patch],
          'api::products.product::doc2': [patch],
        },
      };
      const action: Action = {
        type: 'CLEAR_PENDING_CONNECTS',
        payload: { documentMeta: { model: doc1.model, documentId: doc1.documentId } },
      };

      const result = reducer(stateWithPending, action);

      expect(result.pendingConnects).toEqual({
        'api::products.product::doc2': [patch],
      });
    });

    it('is a no-op when there are no pending connects for the given document', () => {
      const action: Action = {
        type: 'CLEAR_PENDING_CONNECTS',
        payload: { documentMeta: { model: doc1.model, documentId: doc1.documentId } },
      };

      const result = reducer(initialState, action);

      expect(result).toBe(initialState);
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

describe('prefillParentRelation', () => {
  const parentDocument = {
    id: 12,
    documentId: 'article-doc',
    locale: 'en',
    status: 'draft',
    title: 'West Ham post match analysis',
    authors: { count: 1 },
  };
  const childSchema = {
    attributes: {
      articles: {
        type: 'relation',
        target: 'api::article.article',
        mappedBy: 'authors',
      },
    },
  };
  const initialValues = { articles: { connect: [], disconnect: [] } } as AnyData;
  const params = {
    initialValues,
    childSchema,
    parentDocument,
    parentModel: 'api::article.article',
  };

  it('pre-fills the inverse field from a bidirectional parent', () => {
    const result = prefillParentRelation({ ...params, fieldToConnect: 'authors' });

    expect(result).toEqual({
      articles: {
        connect: [
          expect.objectContaining({
            id: 12,
            documentId: 'article-doc',
            title: 'West Ham post match analysis',
            apiData: expect.objectContaining({ documentId: 'article-doc', isTemporary: true }),
          }),
        ],
        disconnect: [],
      },
    });
    expect((result as { articles: { connect: object[] } }).articles.connect[0]).not.toHaveProperty(
      'authors'
    );
  });

  it('does not treat a component path as the inverse of a top-level field with the same last segment', () => {
    expect(prefillParentRelation({ ...params, fieldToConnect: 'seo.authors' })).toBe(initialValues);
  });

  it('does not pre-fill one-way relations, missing inverses, or unsaved parents', () => {
    expect(prefillParentRelation({ ...params, fieldToConnect: 'cover' })).toBe(initialValues);
    expect(
      prefillParentRelation({
        ...params,
        fieldToConnect: 'authors',
        childSchema: { attributes: { name: { type: 'string' } } },
      })
    ).toBe(initialValues);
    expect(
      prefillParentRelation({
        ...params,
        fieldToConnect: 'authors',
        parentDocument: { title: 'Draft parent' },
      })
    ).toBe(initialValues);
  });
});
