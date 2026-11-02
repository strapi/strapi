import * as React from 'react';

import { fireEvent, render, screen, waitFor } from '@tests/utils';

const mockCreate = jest.fn();
const mockUpdateDocument = jest.fn();
const mockPublish = jest.fn();
const mockSetParentFormValue = jest.fn();
const mockDispatch = jest.fn();
const mockCountDraftRelations = jest.fn();
const mockUseDraftRelationCountQuery = jest.fn();
const mockDiscard = jest.fn();
const mockFetchDraftDocument = jest.fn();
const mockNavigate = jest.fn();
const mockParams: { id?: string } = {};
let mockIsRelationModalContext = true;
let mockIsAnyRelationModalOpen = false;
let parentInitialFormValues: Record<string, unknown> | undefined;
let currentDocumentSchema: { options: { draftAndPublish: boolean } } = {
  options: { draftAndPublish: true },
};
let relationModalState = {
  isModalOpen: true,
  fieldToConnect: 'relation',
  fieldToConnectUID: undefined as string | undefined,
  getParentFormValues: undefined as (() => Record<string, unknown>) | undefined,
  setParentFormValue: undefined as ((path: string, value: unknown) => void) | undefined,
  documentHistory: [
    {
      documentId: 'parent',
      model: 'api::parent.parent',
      collectionType: 'collection-types',
      params: {},
    },
    {
      documentId: undefined,
      model: 'api::child.child',
      collectionType: 'collection-types',
      params: {},
    },
  ],
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useForm: (_name: string, selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      modified: true,
      isSubmitting: false,
      initialValues: {},
      values: {},
      getValues: () => ({}),
      validate: async () => ({ errors: undefined }),
      setSubmitting: jest.fn(),
      setErrors: jest.fn(),
      resetForm: jest.fn(),
    }),
  useQueryParams: () => [{ rawQuery: '', query: {} }],
  useGuidedTour: () => jest.fn(),
  useIsDesktop: () => true,
}));
jest.mock('../../../../hooks/useDocumentActions', () => ({
  useDocumentActions: () => ({
    create: mockCreate,
    update: mockUpdateDocument,
    publish: mockPublish,
    discard: mockDiscard,
    isLoading: false,
  }),
}));
jest.mock('../../../../hooks/useDocument', () => ({
  useDoc: () => ({
    schema: { options: { draftAndPublish: true } },
    getInitialFormValues: () => parentInitialFormValues,
  }),
  useDocument: () => ({
    getInitialFormValues: () => parentInitialFormValues,
    schema: undefined,
    components: {},
  }),
}));
jest.mock('../../../../hooks/useDocumentContext', () => ({
  useDocumentContext: () => ({
    currentDocument: { schema: currentDocumentSchema, components: {} },
    currentDocumentMeta: {
      documentId: undefined,
      model: 'api::child.child',
      collectionType: 'collection-types',
      params: {},
    },
  }),
}));
jest.mock('../../../../features/DocumentRBAC', () => ({
  useDocumentRBAC: () => ({ canPublish: true, canReadFields: [] }),
}));
jest.mock('../../../../preview/pages/Preview', () => ({ usePreviewContext: () => false }));
jest.mock('../../../../services/documents', () => ({
  useGetDraftRelationCountQuery: (...args: unknown[]) => mockUseDraftRelationCountQuery(...args),
  useLazyGetDraftRelationCountQuery: () => [mockCountDraftRelations, { isError: false }],
  useLazyGetDocumentQuery: () => [mockFetchDraftDocument],
}));
jest.mock('../FormInputs/Relations/RelationModal', () => ({
  isAnyRelationModalOpen: () => mockIsAnyRelationModalOpen,
  useRelationModal: (_name: string, selector: (state: Record<string, unknown>) => unknown) => {
    if (!mockIsRelationModalContext) {
      return undefined;
    }

    return selector({
      dispatch: mockDispatch,
      currentDocument: { schema: { options: { draftAndPublish: true } } },
      rootDocumentMeta: {
        documentId: 'parent',
        model: 'api::parent.parent',
        collectionType: 'collection-types',
        params: {},
      },
      state: {
        ...relationModalState,
      },
    });
  },
}));

import {
  DiscardAction,
  DocumentActions,
  DocumentActionsMenu,
  openPublishConfirmDialog,
  PublishAction,
  UpdateAction,
} from '../DocumentActions';

const ActionHarness = ({ Action, label }: { Action: typeof UpdateAction; label: string }) => {
  const action = Action({
    activeTab: 'draft',
    documentId: undefined,
    model: 'api::child.child',
    collectionType: 'collection-types',
    meta: { availableStatus: [], availableLocales: [] },
    document: { documentId: 'child', id: 1, status: 'draft' },
  });

  if (!action) {
    return null;
  }

  return <button onClick={() => action.onClick?.({} as React.SyntheticEvent)}>{label}</button>;
};

describe('PublishAction create navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRelationModalContext = false;
    mockParams.id = 'create';
    mockPublish.mockResolvedValue({ data: { documentId: 'published', locale: 'en' } });
    mockCountDraftRelations.mockResolvedValue({
      data: { unpublishedRelations: 0, draftM2mLinks: 0 },
      error: undefined,
    });
  });

  afterEach(() => {
    mockIsRelationModalContext = true;
    delete mockParams.id;
  });

  it('replaces the create route after publishing a new collection-type entry', async () => {
    const { user } = render(<ActionHarness Action={PublishAction} label="Publish" />);

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        {
          pathname: '../collection-types/api::child.child/published',
          search: '',
        },
        { replace: true }
      )
    );
  });

  it('does not navigate after publishing an existing collection-type entry', async () => {
    mockParams.id = 'existing-entry';
    const { user } = render(<ActionHarness Action={PublishAction} label="Publish" />);

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('relation parent updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRelationModalContext = true;
    parentInitialFormValues = undefined;
    relationModalState = {
      isModalOpen: true,
      fieldToConnect: 'relation',
      fieldToConnectUID: undefined,
      getParentFormValues: undefined,
      setParentFormValue: undefined,
      // A single entry (just the child being created/published) means its parent is the ROOT
      // document that originally opened the modal — its own Form stays mounted for the whole
      // session, so connecting writes directly into it via setParentFormValue. See the "nested
      // relation parent updates" describe below for the case with a parent still further up
      // documentHistory, which goes through dispatch's connectPatch instead.
      documentHistory: [
        {
          documentId: undefined,
          model: 'api::child.child',
          collectionType: 'collection-types',
          params: {},
        },
      ],
    };
    mockCreate.mockResolvedValue({ data: { id: 101, documentId: 'created', locale: 'en' } });
    mockPublish.mockResolvedValue({ data: { id: 102, documentId: 'published', locale: 'en' } });
    // No draft row configured by default; buildRelationConnectPatch then falls back to the
    // publish response itself, matching the tests below that don't care about the draft-id fix.
    mockFetchDraftDocument.mockResolvedValue({ data: undefined });
    mockCountDraftRelations.mockResolvedValue({
      data: { unpublishedRelations: 0, draftM2mLinks: 0 },
      error: undefined,
    });
  });

  it('completes UpdateAction child creation without connecting the parent when no setter is provided', async () => {
    const { user } = render(<ActionHarness Action={UpdateAction} label="Save child" />);

    await user.click(screen.getByRole('button', { name: 'Save child' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'GO_TO_CREATED_RELATION' })
      )
    );
    expect(mockSetParentFormValue).not.toHaveBeenCalled();
  });

  it('completes PublishAction child publication without connecting the parent when no setter is provided', async () => {
    const { user } = render(<ActionHarness Action={PublishAction} label="Publish child" />);

    await user.click(screen.getByRole('button', { name: 'Publish child' }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'GO_TO_CREATED_RELATION' })
      )
    );
    expect(mockSetParentFormValue).not.toHaveBeenCalled();
  });

  it('connects a missing top-level relation locally without creating an empty field when no component UID exists', async () => {
    relationModalState.getParentFormValues = () => ({});
    relationModalState.setParentFormValue = mockSetParentFormValue;
    const { user } = render(<ActionHarness Action={UpdateAction} label="Save child" />);

    await user.click(screen.getByRole('button', { name: 'Save child' }));

    await waitFor(() => expect(mockSetParentFormValue).toHaveBeenCalled());

    expect(mockSetParentFormValue).toHaveBeenCalledWith('relation', {
      connect: [{ id: 101, documentId: 'created', locale: 'en', status: 'draft' }],
      disconnect: [],
    });
    // Only the relation field itself is set locally — nothing else touches the parent form.
    expect(mockSetParentFormValue).toHaveBeenCalledTimes(1);
  });

  it('preserves existing component metadata when connecting a missing relation without a UID', async () => {
    relationModalState = {
      ...relationModalState,
      fieldToConnect: 'component.relation',
      getParentFormValues: () => ({ component: { __component: 'shared.component' } }),
      setParentFormValue: mockSetParentFormValue,
    };
    const { user } = render(<ActionHarness Action={UpdateAction} label="Save child" />);

    await user.click(screen.getByRole('button', { name: 'Save child' }));

    await waitFor(() => expect(mockSetParentFormValue).toHaveBeenCalled());

    expect(mockSetParentFormValue).toHaveBeenCalledWith('component.relation', {
      connect: [{ id: 101, documentId: 'created', locale: 'en', status: 'draft' }],
      disconnect: [],
    });
    // The existing __component metadata is left as-is in the live form, not resent.
    expect(mockSetParentFormValue).not.toHaveBeenCalledWith(
      'component.__component',
      expect.anything()
    );
  });

  it('connects the relation locally without persisting or touching the parent form other live field values', async () => {
    relationModalState.getParentFormValues = () => ({ title: 'Unsaved parent title' });
    relationModalState.setParentFormValue = mockSetParentFormValue;
    const { user } = render(<ActionHarness Action={UpdateAction} label="Save child" />);

    await user.click(screen.getByRole('button', { name: 'Save child' }));

    await waitFor(() => expect(mockSetParentFormValue).toHaveBeenCalled());

    expect(mockSetParentFormValue).toHaveBeenCalledWith('relation', {
      connect: [{ id: 101, documentId: 'created', locale: 'en', status: 'draft' }],
      disconnect: [],
    });
    // The parent's other unsaved field ('title') is never read back into a server call, or set.
    expect(mockSetParentFormValue).toHaveBeenCalledTimes(1);
    expect(mockSetParentFormValue).not.toHaveBeenCalledWith('title', expect.anything());
  });

  it('connects a newly published relation using its draft row id, not the published row id', async () => {
    // Publishing a brand-new document creates two DB rows sharing one documentId — a draft and
    // a published row, each with its own numeric id. The parent's relation search identifies
    // already-connected items by the draft row's id, so the connect patch must use that id, not
    // the id the publish response itself carries (which belongs to the published row).
    relationModalState.getParentFormValues = () => ({});
    relationModalState.setParentFormValue = mockSetParentFormValue;
    mockPublish.mockResolvedValue({ data: { id: 999, documentId: 'created', locale: 'en' } });
    mockFetchDraftDocument.mockResolvedValue({
      data: { data: { id: 55, documentId: 'created', locale: 'en' } },
    });

    const { user } = render(<ActionHarness Action={PublishAction} label="Publish child" />);

    await user.click(screen.getByRole('button', { name: 'Publish child' }));

    await waitFor(() => expect(mockSetParentFormValue).toHaveBeenCalled());

    expect(mockFetchDraftDocument).toHaveBeenCalledWith({
      collectionType: 'collection-types',
      model: 'api::child.child',
      documentId: 'created',
      params: {},
    });
    expect(mockSetParentFormValue).toHaveBeenCalledWith('relation', {
      connect: [{ id: 55, documentId: 'created', locale: 'en', status: 'published' }],
      disconnect: [],
    });
  });
});

describe('nested relation parent updates', () => {
  // Every level of a nested relation-on-the-fly chain (root aside) shares one Form instance
  // whose values get wholesale-replaced by fresh initialValues on every documentHistory
  // navigation, so writing straight into it (as the root-level case does) would land on the
  // wrong document and then immediately be discarded. These tests assert the connect is instead
  // queued via dispatch's connectPatch, to be re-applied once the target document is current
  // again — see RelationModal.tsx's `pendingConnects`.
  const NestedActionHarness = ({
    Action,
    label,
  }: {
    Action: typeof UpdateAction;
    label: string;
  }) => {
    const action = Action({
      activeTab: 'draft',
      documentId: undefined,
      model: 'api::child.child',
      collectionType: 'collection-types',
      meta: { availableStatus: [], availableLocales: [] },
      document: { documentId: 'child', id: 1, status: 'draft' },
    });

    if (!action) {
      return null;
    }

    return <button onClick={() => action.onClick?.({} as React.SyntheticEvent)}>{label}</button>;
  };

  const ExistingDocumentActionHarness = ({
    Action,
    label,
  }: {
    Action: typeof UpdateAction;
    label: string;
  }) => {
    const action = Action({
      activeTab: 'draft',
      documentId: 'existing-child',
      model: 'api::child.child',
      collectionType: 'collection-types',
      meta: { availableStatus: [], availableLocales: [] },
      document: { documentId: 'existing-child', id: 1, status: 'draft' },
    });

    if (!action) {
      return null;
    }

    return <button onClick={() => action.onClick?.({} as React.SyntheticEvent)}>{label}</button>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRelationModalContext = true;
    parentInitialFormValues = undefined;
    relationModalState = {
      isModalOpen: true,
      fieldToConnect: 'relation',
      fieldToConnectUID: undefined,
      getParentFormValues: () => ({}),
      // Deliberately set: the nested path must never call it directly, even though it's
      // available — a regression here would mean writing into the wrong (shared, ephemeral)
      // modal Form again, exactly the bug this describe block guards against.
      setParentFormValue: mockSetParentFormValue,
      // Two entries: a grandparent still open further up the modal, and the child currently
      // being created/published. This is what marks the connect as targeting a NESTED parent
      // rather than the root document.
      documentHistory: [
        {
          documentId: 'grandparent',
          model: 'api::parent.parent',
          collectionType: 'collection-types',
          params: {},
        },
        {
          documentId: undefined,
          model: 'api::child.child',
          collectionType: 'collection-types',
          params: {},
        },
      ],
    };
    mockCreate.mockResolvedValue({ data: { id: 101, documentId: 'created', locale: 'en' } });
    mockPublish.mockResolvedValue({ data: { id: 102, documentId: 'published', locale: 'en' } });
    mockFetchDraftDocument.mockResolvedValue({ data: undefined });
    mockCountDraftRelations.mockResolvedValue({
      data: { unpublishedRelations: 0, draftM2mLinks: 0 },
      error: undefined,
    });
    mockUpdateDocument.mockResolvedValue({ data: {} });
  });

  it('queues a connect patch for the nested parent instead of writing into the shared modal form, on save', async () => {
    const { user } = render(<NestedActionHarness Action={UpdateAction} label="Save child" />);

    await user.click(screen.getByRole('button', { name: 'Save child' }));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'GO_TO_CREATED_RELATION',
        payload: {
          document: {
            documentId: 'created',
            collectionType: 'collection-types',
            model: 'api::child.child',
            params: {},
          },
          shouldBypassConfirmation: true,
          connectPatch: {
            fieldToConnect: 'relation',
            relationValue: {
              connect: [{ id: 101, documentId: 'created', locale: 'en', status: 'draft' }],
              disconnect: [],
            },
            componentUIDPath: undefined,
            componentUID: undefined,
          },
        },
      })
    );
    expect(mockSetParentFormValue).not.toHaveBeenCalled();
  });

  it('queues a connect patch for the nested parent instead of writing into the shared modal form, on publish', async () => {
    const { user } = render(<NestedActionHarness Action={PublishAction} label="Publish child" />);

    await user.click(screen.getByRole('button', { name: 'Publish child' }));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'GO_TO_CREATED_RELATION',
        payload: {
          document: {
            documentId: 'published',
            collectionType: 'collection-types',
            model: 'api::child.child',
            params: {},
          },
          shouldBypassConfirmation: true,
          connectPatch: {
            fieldToConnect: 'relation',
            relationValue: {
              connect: [{ id: 102, documentId: 'published', locale: 'en', status: 'published' }],
              disconnect: [],
            },
            componentUIDPath: undefined,
            componentUID: undefined,
          },
        },
      })
    );
    expect(mockSetParentFormValue).not.toHaveBeenCalled();
  });

  it('includes the new component UID in the queued patch when the nested field is inside an unsaved component', async () => {
    relationModalState.fieldToConnect = 'component.relation';
    relationModalState.fieldToConnectUID = 'shared.component';

    const { user } = render(<NestedActionHarness Action={UpdateAction} label="Save child" />);

    await user.click(screen.getByRole('button', { name: 'Save child' }));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GO_TO_CREATED_RELATION',
          payload: expect.objectContaining({
            connectPatch: {
              fieldToConnect: 'component.relation',
              relationValue: {
                connect: [{ id: 101, documentId: 'created', locale: 'en', status: 'draft' }],
                disconnect: [],
              },
              componentUIDPath: 'component.__component',
              componentUID: 'shared.component',
            },
          }),
        })
      )
    );
  });

  it('clears any pending connects recorded against a document once it is itself saved', async () => {
    const { user } = render(
      <ExistingDocumentActionHarness Action={UpdateAction} label="Save existing" />
    );

    await user.click(screen.getByRole('button', { name: 'Save existing' }));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'CLEAR_PENDING_CONNECTS',
        payload: { documentMeta: { model: 'api::child.child', documentId: 'existing-child' } },
      })
    );
  });
});

describe('save keyboard shortcut while the relation modal is open', () => {
  // Renders a background (non relation-modal) instance and a relation-modal instance of the
  // action side by side, each reading `mockIsRelationModalContext` at its own render time so
  // both flavours of the same `UpdateAction`/`PublishAction` mount simultaneously — mirroring
  // the real app where the edit view's panel and the relation modal each mount their own copy.
  const BackgroundActionHarness = ({
    Action,
    label,
  }: {
    Action: typeof UpdateAction;
    label: string;
  }) => {
    mockIsRelationModalContext = false;
    const action = Action({
      activeTab: 'draft',
      documentId: 'background-entry',
      model: 'api::child.child',
      collectionType: 'collection-types',
      meta: { availableStatus: [], availableLocales: [] },
      // Omitting `document` skips the draft-relations count fetch entirely, keeping this
      // harness's async footprint minimal.
      document: undefined,
    });

    if (!action) {
      return null;
    }

    return <button onClick={() => action.onClick?.({} as React.SyntheticEvent)}>{label}</button>;
  };

  const ModalActionHarness = ({
    Action,
    label,
  }: {
    Action: typeof UpdateAction;
    label: string;
  }) => {
    mockIsRelationModalContext = true;
    const action = Action({
      activeTab: 'draft',
      documentId: undefined,
      model: 'api::child.child',
      collectionType: 'collection-types',
      meta: { availableStatus: [], availableLocales: [] },
      document: undefined,
    });

    if (!action) {
      return null;
    }

    return <button onClick={() => action.onClick?.({} as React.SyntheticEvent)}>{label}</button>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAnyRelationModalOpen = true;
    relationModalState = {
      isModalOpen: true,
      fieldToConnect: 'relation',
      fieldToConnectUID: undefined,
      getParentFormValues: undefined,
      setParentFormValue: undefined,
      documentHistory: [
        {
          documentId: 'parent',
          model: 'api::parent.parent',
          collectionType: 'collection-types',
          params: {},
        },
        {
          documentId: undefined,
          model: 'api::child.child',
          collectionType: 'collection-types',
          params: {},
        },
      ],
    };
    mockCreate.mockResolvedValue({ data: { documentId: 'created', locale: 'en' } });
    mockUpdateDocument.mockResolvedValue({ data: {} });
    mockPublish.mockResolvedValue({ data: { documentId: 'published', locale: 'en' } });
    mockCountDraftRelations.mockResolvedValue({
      data: { unpublishedRelations: 0, draftM2mLinks: 0 },
      error: undefined,
    });
  });

  afterEach(() => {
    mockIsRelationModalContext = true;
    mockIsAnyRelationModalOpen = false;
  });

  it('only saves the relation modal entry, not the background entry, on Cmd/Ctrl+S', async () => {
    render(
      <>
        <BackgroundActionHarness Action={UpdateAction} label="Save background" />
        <ModalActionHarness Action={UpdateAction} label="Save modal" />
      </>
    );

    fireEvent.keyDown(window, { key: 's', metaKey: true });

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockUpdateDocument).not.toHaveBeenCalled();
  });

  it('only publishes the relation modal entry, not the background entry, on Cmd/Ctrl+Shift+Enter', async () => {
    render(
      <>
        <BackgroundActionHarness Action={PublishAction} label="Publish background" />
        <ModalActionHarness Action={PublishAction} label="Publish modal" />
      </>
    );

    fireEvent.keyDown(window, { key: 'Enter', metaKey: true, shiftKey: true });

    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
  });
});

describe('draft relations count fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountDraftRelations.mockResolvedValue({
      data: { unpublishedRelations: 0, draftM2mLinks: 0 },
      error: undefined,
    });
  });

  afterEach(() => {
    currentDocumentSchema = { options: { draftAndPublish: true } };
  });

  it('fetches the draft relations count for a Draft & Publish content type', async () => {
    currentDocumentSchema = { options: { draftAndPublish: true } };

    render(<ActionHarness Action={PublishAction} label="Publish child" />);

    await waitFor(() => expect(mockCountDraftRelations).toHaveBeenCalled());
  });

  it('does not fetch the draft relations count for a non Draft & Publish content type', async () => {
    currentDocumentSchema = { options: { draftAndPublish: false } };

    render(<ActionHarness Action={PublishAction} label="Publish child" />);

    expect(mockCountDraftRelations).not.toHaveBeenCalled();
  });
});

describe('DiscardAction draft relations warning', () => {
  const DiscardHarness = () => {
    const action = DiscardAction({
      activeTab: 'draft',
      documentId: 'child',
      model: 'api::child.child',
      collectionType: 'collection-types',
      meta: { availableStatus: [], availableLocales: [] },
      document: { documentId: 'child', id: 1, status: 'modified' },
    });

    if (!action) {
      return null;
    }

    return <DocumentActions actions={[{ id: 'discard', ...action }]} />;
  };

  const mockCountQueryState = (state: Record<string, unknown>) => {
    mockUseDraftRelationCountQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      ...state,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('warns that relations to draft entries will be removed', async () => {
    mockCountQueryState({ data: { data: { unpublishedRelations: 1, draftM2mLinks: 1 } } });

    const { user } = render(<DiscardHarness />);

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    const warning = screen.getByText(
      "2 linked entries are still in draft. Discarding will remove those relations, because unpublished entries aren't part of the published version."
    );
    const confirmation = screen.getByText('Are you sure?');

    expect(warning.compareDocumentPosition(confirmation)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('does not warn when there are no relations to draft entries', async () => {
    mockCountQueryState({ data: { data: { unpublishedRelations: 0, draftM2mLinks: 0 } } });

    const { user } = render(<DiscardHarness />);

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(screen.getByRole('heading', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.queryByText(/still in draft/)).not.toBeInTheDocument();
    expect(
      screen.queryByText('Any relations to unpublished entries will be removed.')
    ).not.toBeInTheDocument();
  });

  it('shows a generic warning when the draft relations count fails to load', async () => {
    mockCountQueryState({ isError: true });

    const { user } = render(<DiscardHarness />);

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(
      screen.getByText('Any relations to unpublished entries will be removed.')
    ).toBeInTheDocument();
  });

  it('is disabled until the draft relations count has loaded', () => {
    mockCountQueryState({ isLoading: true });

    render(<DiscardHarness />);

    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
  });

  it('shares the draft relations count request with the publish action', () => {
    mockCountQueryState({ data: { data: { unpublishedRelations: 0, draftM2mLinks: 0 } } });

    render(<DiscardHarness />);

    expect(mockUseDraftRelationCountQuery).toHaveBeenCalledWith(
      {
        collectionType: 'collection-types',
        model: 'api::child.child',
        documentId: 'child',
        params: {},
      },
      { skip: false }
    );
  });
});

describe('DocumentActions', () => {
  it('it should render a single button when there is only one action', () => {
    render(<DocumentActions actions={[{ id: '1', label: 'Action 1', onClick: jest.fn() }]} />);

    expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('should render two buttons when there are two actions', () => {
    render(
      <DocumentActions
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn() },
          { id: '2', label: 'Action 2', onClick: jest.fn() },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('should render a menu when there are more than two actions', async () => {
    const { user } = render(
      <DocumentActions
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn() },
          { id: '2', label: 'Action 2', onClick: jest.fn() },
          { id: '3', label: 'Action 3', onClick: jest.fn() },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'More document actions' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    expect(screen.getByRole('menuitem', { name: 'Action 3' })).toBeInTheDocument();
  });

  it('should disable the menu when all the actions for the menu are disabled', () => {
    render(
      <DocumentActions
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn() },
          { id: '2', label: 'Action 2', onClick: jest.fn() },
          { id: '3', label: 'Action 3', onClick: jest.fn(), disabled: true },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'More document actions' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('should show the save keyboard shortcut hint on the primary action by default', async () => {
    const { user } = render(
      <DocumentActions actions={[{ id: '1', label: 'Save', onClick: jest.fn() }]} />
    );

    await user.hover(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findAllByText('Ctrl / Cmd + Enter to save')).length).toBeGreaterThan(0);
  });

  it('should show the publish keyboard shortcut hint when the primary action is a publish action', async () => {
    const { user } = render(
      <DocumentActions
        actions={[{ id: '1', label: 'Publish', type: 'publish', onClick: jest.fn() }]}
      />
    );

    await user.hover(screen.getByRole('button', { name: 'Publish' }));

    expect(
      (await screen.findAllByText('Ctrl / Cmd + Shift + Enter to publish')).length
    ).toBeGreaterThan(0);
  });

  it('should show the save keyboard shortcut hint on the secondary action', async () => {
    const { user } = render(
      <DocumentActions
        actions={[
          { id: '1', label: 'Publish', type: 'publish', onClick: jest.fn() },
          { id: '2', label: 'Save', onClick: jest.fn() },
        ]}
      />
    );

    await user.hover(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findAllByText('Ctrl / Cmd + Enter to save')).length).toBeGreaterThan(0);
  });

  it('should show the publish keyboard shortcut hint on the secondary action', async () => {
    const { user } = render(
      <DocumentActions
        actions={[
          { id: '1', label: 'Save', onClick: jest.fn() },
          { id: '2', label: 'Publish', type: 'publish', onClick: jest.fn() },
        ]}
      />
    );

    await user.hover(screen.getByRole('button', { name: 'Publish' }));

    expect(
      (await screen.findAllByText('Ctrl / Cmd + Shift + Enter to publish')).length
    ).toBeGreaterThan(0);
  });

  it('should not show a keyboard shortcut hint when the action is disabled', async () => {
    const { user } = render(
      <DocumentActions actions={[{ id: '1', label: 'Save', onClick: jest.fn(), disabled: true }]} />
    );

    await user.hover(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByText('Ctrl / Cmd + Enter to save')).not.toBeInTheDocument();
  });

  it('should render a notification if either of the button actions has been pressed and the notification dialog props are provided', async () => {
    const onClick1 = jest.fn();
    const onClick2 = jest.fn();

    const { user } = render(
      <DocumentActions
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick: onClick1,
            dialog: { type: 'notification', title: 'Action 1 pressed!' },
          },
          {
            id: '2',
            label: 'Action 2',
            onClick: onClick2,
            dialog: { type: 'notification', title: 'Action 2 pressed!' },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Action 1' }));

    expect(screen.getByText('Action 1 pressed!')).toBeInTheDocument();
    expect(onClick1).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Action 2' }));

    expect(screen.getByText('Action 2 pressed!')).toBeInTheDocument();
    expect(onClick2).toHaveBeenCalled();
  });

  it('should not open the dialog when a publish confirm scope is registered but not requested', async () => {
    render(
      <DocumentActions
        actions={[
          {
            id: '1',
            type: 'publish',
            label: 'Publish',
            onClick: jest.fn(),
            publishConfirmScope: 'panel',
            dialog: {
              type: 'dialog',
              title: 'Confirmation',
              content: 'Draft relations will not be included.',
              confirmLabel: 'Publish without relations',
              onConfirm: jest.fn(),
            },
          },
        ]}
      />
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('should open the dialog when the publish confirm opener is called', async () => {
    const onConfirm = jest.fn();

    render(
      <DocumentActions
        actions={[
          {
            id: '1',
            type: 'publish',
            label: 'Publish',
            onClick: jest.fn(),
            publishConfirmScope: 'panel',
            dialog: {
              type: 'dialog',
              title: 'Confirmation',
              content: 'Draft relations will not be included.',
              confirmLabel: 'Publish without relations',
              onConfirm,
            },
          },
        ]}
      />
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    openPublishConfirmDialog('panel');

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Draft relations will not be included.')).toBeInTheDocument();
  });

  it('should render a custom confirm label when provided', async () => {
    const onConfirm = jest.fn();

    const { user } = render(
      <DocumentActions
        actions={[
          {
            id: '1',
            label: 'Publish',
            onClick: jest.fn(),
            dialog: {
              type: 'dialog',
              title: 'Confirmation',
              content: 'Draft relations will not be included.',
              confirmLabel: 'Publish without relations',
              onConfirm,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(screen.getByRole('button', { name: 'Publish without relations' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publish without relations' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('should center dialog content with a warning icon when bodyIcon is set', async () => {
    const { user } = render(
      <DocumentActions
        actions={[
          {
            id: '1',
            label: 'Publish',
            onClick: jest.fn(),
            dialog: {
              type: 'dialog',
              title: 'Confirmation',
              bodyIcon: 'danger',
              content: 'Draft relations will not be included.',
              confirmLabel: 'Publish without relations',
              onConfirm: jest.fn(),
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Draft relations will not be included.')).toHaveAttribute(
      'id',
      'confirm-description'
    );
  });

  it('should render a dialog if either of the button actions has been pressed and the dialog props are provided', async () => {
    const onClick = jest.fn();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { user } = render(
      <DocumentActions
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: {
              type: 'dialog',
              title: 'Confirmation',
              content: <p>Are you sure?</p>,
              onConfirm,
              onCancel,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Action 1' }));

    expect(screen.getByRole('heading', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Action 1' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('should render a modal if either of the button actions has been pressed and the modal props are provided', async () => {
    const onClick = jest.fn();
    const onClose = jest.fn();

    const { user } = render(
      <DocumentActions
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: {
              type: 'modal',
              title: 'hello world',
              content: <p>body</p>,
              footer: <p>footer</p>,
              onClose,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('footer')).toBeInTheDocument();

    expect(onClick).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('DocumentActionsMenu', () => {
  it('should render a menu with the given actions', async () => {
    const { user } = render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn() },
          { id: '2', label: 'Action 2', onClick: jest.fn() },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'More document actions' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    expect(screen.getByRole('menuitem', { name: 'Action 1' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Action 2' })).toBeInTheDocument();
  });

  it('should be disabled if all the actions are disabled', () => {
    render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn(), disabled: true },
          { id: '2', label: 'Action 2', onClick: jest.fn(), disabled: true },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'More document actions' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it("should render an actions's icon if provided", async () => {
    const { user } = render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn(), icon: <span>icon 1</span> },
          { id: '2', label: 'Action 2', onClick: jest.fn(), icon: <span>icon 2</span> },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    expect(screen.getByText('icon 1')).toBeInTheDocument();
    expect(screen.getByText('icon 2')).toBeInTheDocument();
  });

  it("should render the action's variant if provided", async () => {
    const { user } = render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn(), variant: 'default' },
          { id: '3', label: 'Action 3', onClick: jest.fn(), variant: 'danger' },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    expect(screen.getByText('Action 1')).toHaveStyle({ color: 'rgb(50, 50, 77);' }); // neutral800
    expect(screen.getByText('Action 3')).toHaveStyle({ color: 'rgb(183, 43, 60);' }); // danger700
  });

  it('should render a notification if action has been pressed and the notification dialog props are provided', async () => {
    const onClick = jest.fn();

    const { user } = render(
      <DocumentActionsMenu
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: { type: 'notification', title: 'hello world' },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
  });

  it('should render a dialog if the action has been pressed and the dialog props are provided', async () => {
    const onClick = jest.fn();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { user } = render(
      <DocumentActionsMenu
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: {
              type: 'dialog',
              title: 'hello world',
              content: <p>are you sure?</p>,
              onConfirm,
              onCancel,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText('are you sure?')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'More document actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('should render a modal if the action has been pressed and the modal props are provided', async () => {
    const onClick = jest.fn();
    const onClose = jest.fn();

    const { user } = render(
      <DocumentActionsMenu
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: {
              type: 'modal',
              title: 'hello world',
              content: <p>body</p>,
              footer: <p>footer</p>,
              onClose,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('footer')).toBeInTheDocument();

    expect(onClick).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('should show correct background colors on hover for different variants', async () => {
    const { user } = render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn(), variant: 'default' },
          { id: '2', label: 'Action 2', onClick: jest.fn(), variant: 'danger', disabled: false },
          { id: '3', label: 'Action 3', onClick: jest.fn(), variant: 'danger', disabled: true },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    const neutralMenuItem = screen.getByText('Action 1');
    await user.hover(neutralMenuItem);
    expect(neutralMenuItem).toHaveStyle({
      backgroundColor: 'theme.colors.neutral',
    });

    const dangerMenuItem = screen.getByText('Action 2');
    await user.hover(dangerMenuItem);
    expect(dangerMenuItem).toHaveStyle({
      backgroundColor: 'theme.colors.danger100',
    });

    const disabledDangerMenuItem = screen.getByText('Action 3');
    await user.hover(disabledDangerMenuItem);
    expect(disabledDangerMenuItem).toHaveStyle({
      backgroundColor: 'theme.colors.neutral',
    });
  });
});
