import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderRTL, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { FormModal } from '../FormModal';
import { initialState } from '../reducer';

const mockAdvanced = jest.fn(() => ({ sections: [] }));
let mockStrictRelations: boolean | undefined;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
  useSelector: () => ({
    ...initialState,
    modifiedData: { type: 'relation', name: 'author' },
  }),
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
    onCloseModal: jest.fn(),
    actionType: 'create',
    attributeType: 'relation',
    forTarget: 'contentType',
    modalType: 'attribute',
    isOpen: true,
    kind: 'collectionType',
    targetUid: 'api::article.article',
    activeTab: 'advanced',
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
    strictRelations: mockStrictRelations,
  }),
}));

jest.mock('../../CTBSession/ctbSession', () => ({
  ...jest.requireActual('../../CTBSession/ctbSession'),
  useCTBTracking: () => ({ trackUsage: jest.fn() }),
}));

jest.mock('../forms/forms', () => ({
  forms: {
    attribute: {
      form: {
        advanced: (...args: unknown[]) => mockAdvanced(...(args as [])),
        base: () => ({ sections: [] }),
      },
    },
  },
}));
jest.mock('../../FormModalHeader', () => ({
  FormModalHeader: () => {
    const { Modal } = jest.requireActual('@strapi/design-system');

    return (
      <Modal.Header>
        <Modal.Title>Add relation</Modal.Title>
      </Modal.Header>
    );
  },
}));
jest.mock('../../FormModalSubHeader', () => ({ FormModalSubHeader: () => null }));
jest.mock('../../FormModalEndActions', () => ({ FormModalEndActions: () => null }));

const renderModal = () =>
  renderRTL(
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}} onError={() => {}}>
        <DesignSystemProvider>
          <FormModal />
        </DesignSystemProvider>
      </IntlProvider>
    </MemoryRouter>
  );

describe('FormModal strictRelations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])(
    'passes strictRelations=%s from the data manager to the advanced form',
    async (value) => {
      mockStrictRelations = value;
      renderModal();

      await screen.findByRole('dialog', { name: 'Add relation' });

      expect(mockAdvanced).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'relation', strictRelations: value })
      );
    }
  );
});
