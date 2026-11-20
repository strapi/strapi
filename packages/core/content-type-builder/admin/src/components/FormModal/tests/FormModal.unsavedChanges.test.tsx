import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderRTL, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { FormModal } from '../FormModal';
import { initialState } from '../reducer';

const UNSAVED_MESSAGE =
  'You have unsaved changes. Are you sure you want to close? All your modifications will be lost.';

const mockOnCloseModal = jest.fn();
const mockDispatch = jest.fn();
let mockReducerState = initialState;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: () => mockReducerState,
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useStrapiApp: (_name: string, selector: (state: unknown) => unknown) =>
    selector({
      getPlugin: () => ({ apis: { forms: { components: { inputs: {} } } } }),
      customFields: { get: () => undefined },
    }),
  useNotification: () => ({ toggleNotification: jest.fn() }),
  useGuidedTour: () => jest.fn(),
}));

jest.mock('../../FormModalNavigation/useFormModalNavigation', () => ({
  useFormModalNavigation: () => ({
    onCloseModal: mockOnCloseModal,
    actionType: 'edit',
    forTarget: 'contentType',
    modalType: 'contentType',
    isOpen: true,
    kind: 'collectionType',
    targetUid: 'api::article.article',
    activeTab: 'basic',
    setActiveTab: jest.fn(),
  }),
}));

jest.mock('../../DataManager/useDataManager', () => ({
  useDataManager: () => ({
    contentTypes: {
      'api::article.article': {
        uid: 'api::article.article',
        modelType: 'contentType',
        kind: 'collectionType',
        info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
        options: { draftAndPublish: true },
        attributes: [],
      },
    },
    components: {},
    nestedComponents: [],
    sortedContentTypesList: [],
    reservedNames: { models: [], attributes: [] },
  }),
}));

jest.mock('../../CTBSession/ctbSession', () => ({
  ...jest.requireActual('../../CTBSession/ctbSession'),
  useCTBTracking: () => ({ trackUsage: jest.fn() }),
}));

// The form body is irrelevant to closing the modal, so keep it out of the way.
jest.mock('../forms/forms', () => ({ forms: {} }));
jest.mock('../../FormModalHeader', () => ({
  FormModalHeader: () => {
    const { Modal } = jest.requireActual('@strapi/design-system');

    return (
      <Modal.Header>
        <Modal.Title>Edit Article</Modal.Title>
      </Modal.Header>
    );
  },
}));
jest.mock('../../FormModalSubHeader', () => ({ FormModalSubHeader: () => null }));
jest.mock('../../FormModalEndActions', () => ({ FormModalEndActions: () => null }));

const setup = ({ isDirty, state }: { isDirty?: boolean; state?: Partial<typeof initialState> }) => {
  mockReducerState = {
    ...initialState,
    initialData: { displayName: 'Article' },
    pristineData: { displayName: 'Article' },
    modifiedData: { displayName: isDirty ? 'Post' : 'Article' },
    ...state,
  };

  const user = userEvent.setup();

  renderRTL(
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}} onError={() => {}}>
        <DesignSystemProvider>
          <FormModal />
        </DesignSystemProvider>
      </IntlProvider>
    </MemoryRouter>
  );

  return { user };
};

describe('FormModal unsaved changes', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    confirmSpy = jest.spyOn(window, 'confirm');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('closes immediately on Escape when nothing changed', async () => {
    const { user } = setup({ isDirty: false });

    await screen.findByRole('dialog', { name: 'Edit Article' });
    await user.keyboard('[Escape]');

    expect(mockOnCloseModal).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('closes immediately when a new field only holds its type defaults', async () => {
    // Create flows seed `modifiedData` with defaults while `initialData` stays empty.
    const { user } = setup({
      state: {
        initialData: {},
        pristineData: { type: 'string', default: null },
        modifiedData: { type: 'string', default: null },
      },
    });

    await screen.findByRole('dialog', { name: 'Edit Article' });
    await user.keyboard('[Escape]');

    expect(mockOnCloseModal).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks for confirmation once a new field is edited past its type defaults', async () => {
    const { user } = setup({
      state: {
        initialData: {},
        pristineData: { type: 'string', default: null },
        modifiedData: { type: 'string', default: null, name: 'title' },
      },
    });

    await screen.findByRole('dialog', { name: 'Edit Article' });
    await user.keyboard('[Escape]');

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(UNSAVED_MESSAGE);
    expect(mockOnCloseModal).not.toHaveBeenCalled();
  });

  it('asks for confirmation from Cancel when something changed', async () => {
    const { user } = setup({ isDirty: true });

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(UNSAVED_MESSAGE);
    expect(mockOnCloseModal).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('closes once the confirmation is accepted', async () => {
    const { user } = setup({ isDirty: true });

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mockOnCloseModal).toHaveBeenCalledTimes(1));
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
