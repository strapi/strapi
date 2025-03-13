import { render, screen, fireEvent } from '@tests/utils';
import { useNavigate } from 'react-router-dom';

import { DocumentContextProvider } from '../../../../../../features/DocumentContext';
import { RelationCard } from '../RelationModal';

const relationContext = {
  initialDocument: {
    documentId: 'abcdefg',
    model: 'api::test.test',
    collectionType: 'collection-types',
  },
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('../../../../../../services/documents', () => ({
  useLazyGetDocumentQuery: jest.fn(() => [jest.fn()]),
}));

const mockNavigate = jest.fn();
(useNavigate as jest.Mock).mockReturnValue(mockNavigate);

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

const relation = {
  documentId: 'abcdefg',
  model: 'api::test.test',
  collectionType: 'collection-types',
  params: {},
};

describe('<RelationModal />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trigger button correctly', () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationCard triggerButtonLabel="Open Modal" relation={relation} />
      </DocumentContextProvider>
    );

    expect(screen.getByText('Open Modal')).toBeInTheDocument();
  });

  it('does not render the modal by default', () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationCard triggerButtonLabel="Open Modal" relation={relation} />
      </DocumentContextProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the modal when clicking the trigger button', () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationCard triggerButtonLabel="Open Modal" relation={relation} />
      </DocumentContextProvider>
    );

    const button = screen.getByText('Open Modal');
    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
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

  it('closes the modal when clicking the cancel button', () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationCard triggerButtonLabel="Open Modal" relation={relation} />
      </DocumentContextProvider>
    );

    const button = screen.getByText('Open Modal');
    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates to full page when "Go to entry" is clicked', () => {
    render(
      <DocumentContextProvider {...relationContext}>
        <RelationCard triggerButtonLabel="Open Modal" relation={relation} />
      </DocumentContextProvider>
    );

    fireEvent.click(screen.getByText('Open Modal'));

    const goToEntryButton = screen.getByRole('button', { name: /go to entry/i });
    fireEvent.click(goToEntryButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/content-manager/collection-types/api::test.test/abcdefg'
    );
  });
});
