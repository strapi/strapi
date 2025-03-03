import { render, screen } from '@tests/utils';

import { DocumentContextProvider } from '../../../../../../features/DocumentContext';
import { RelationModalWrapper } from '../RelationModal';

export const relationContext = {
  initialDocument: {
    documentId: 'abcdefg',
    model: 'api::test.test',
    collectionType: 'collection-types',
  },
  setCurrentDocument: jest.fn(),
};

jest.mock('../../../../../../hooks/useDocument', () => ({
  useDoc: jest.fn(() => ({})),
  useDocument: jest.fn(() => ({
    isLoading: false,
    components: {},
    document: {
      category: {
        count: 1,
      },
      createdAt: '2025-02-10T09:44:42.354Z',
      createdBy: {
        firstname: 'John',
        id: '1',
        lastname: 'Doe',
        username: 'johndoe',
      },
      documentId: 'abcdefg',
      id: 1,
      locale: null,
      name: 'test',
      updatedAt: '2025-02-10T09:44:42.354Z',
      updatedBy: {
        firstname: 'John',
        id: '1',
        lastname: 'Doe',
        username: 'johndoe',
      },
    },
    getTitle: jest.fn().mockReturnValue('Test'),
    getInitialFormValues: jest.fn().mockReturnValue({
      name: 'test',
      category: {
        connect: [],
        disconnect: [],
      },
    }),
    meta: {
      availableLocales: [],
      availableStatus: [],
    },
    schema: {
      options: {
        draftAndPublish: false,
      },
    },
  })),
}));

jest.mock('../../../../../../hooks/useDocumentLayout', () => ({
  useDocLayout: jest.fn(() => ({
    edit: {
      components: {},
    },
  })),
  useDocumentLayout: jest.fn().mockReturnValue({
    edit: {
      components: {},
      layout: [
        [
          [
            {
              attribute: { pluginOptions: {}, type: 'string' },
              disabled: false,
              hint: '',
              label: 'name',
              name: 'name',
              mainField: undefined,
              placeholder: '',
              required: false,
              type: 'string',
              unique: false,
              visible: true,
              size: 6,
            },
            {
              attribute: {
                relation: 'oneToOne',
                relationType: 'oneToOne',
                target: 'api::category.category',
                targetModel: 'api::category.category',
                type: 'relation',
              },
              disabled: false,
              hint: '',
              label: 'category',
              mainField: {
                name: 'name',
                type: 'string',
              },
              name: 'category',
              required: false,
              size: 6,
              type: 'relation',
              visible: true,
              unique: false,
            },
          ],
        ],
      ],
      settings: {
        mainField: 'name',
      },
    },
    error: false,
    isLoading: false,
    list: {
      layout: [
        {
          attribute: {
            type: 'integer',
          },
          label: 'id',
          name: 'id',
          searchable: true,
          sortable: true,
        },
        {
          attribute: {
            pluginOptions: {},
            type: 'string',
          },
          label: 'name',
          name: 'name',
          searchable: true,
          sortable: true,
        },
        {
          attribute: {
            relation: 'oneToOne',
            relationType: 'oneToOne',
            target: 'api::category.category',
            targetModel: 'api::category.category',
            type: 'relation',
          },
          label: 'category',
          name: 'category',
          mainField: {
            name: 'name',
            type: 'string',
          },
          searchable: true,
          sortable: true,
        },
      ],
    },
  }),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true, canDelete: true, canPublish: true },
  })),
  useStrapiApp: jest.fn((name, getter) =>
    getter({
      customFields: {
        get: jest.fn(),
      },
      plugins: {
        'content-manager': {
          initializer: jest.fn(),
          injectionZones: {},
          isReady: true,
          name: 'content-manager',
          pluginId: 'content-manager',
          injectComponent: jest.fn(),
          getInjectedComponents: jest.fn(),
          apis: {
            getDocumentActions: () => [],
            getHeaderActions: () => [],
          },
        },
      },
    })
  ),
}));

describe('<RelationModal />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it("doesn't render the modal if we pass an open prop to false", () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationModalWrapper open={false} onToggle={() => {}} />
      </DocumentContextProvider>
    );

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('renders the modal if we pass an open prop to true', () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationModalWrapper open={true} onToggle={() => {}} />
      </DocumentContextProvider>
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
  it('shows the modal with the Edit a relation title, the relation title, the X button and the Cancel button when the modal is to Edit a relation', () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationModalWrapper open={true} onToggle={() => {}} />
      </DocumentContextProvider>
    );

    expect(screen.getByText('Edit a relation')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Test',
        level: 2,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows the modal with an icon button to open the document in fullpage', () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationModalWrapper open={true} onToggle={() => {}} />
      </DocumentContextProvider>
    );

    expect(screen.getByRole('button', { name: 'Go to entry' })).toBeInTheDocument();
  });
});
