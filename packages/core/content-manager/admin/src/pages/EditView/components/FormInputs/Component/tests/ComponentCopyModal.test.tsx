import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen, waitFor } from '@tests/utils';

import { ComponentCopyModal, type ComponentCopyModalProps } from '../ComponentCopyModal';

const components = {
  'shared.opening-time': {
    uid: 'shared.opening-time',
    category: 'shared',
    info: { displayName: 'Opening time' },
    attributes: {
      label: { type: 'string' },
      days: { type: 'string' },
      opens: { type: 'time' },
    },
  },
};

const schema = {
  uid: 'api::restaurant.restaurant',
  attributes: {
    name: { type: 'string' },
    openingTimes: { type: 'component', component: 'shared.opening-time', repeatable: true },
  },
};

const currentDocument = {
  documentId: 'current',
  id: 1,
  name: 'Café Lumière',
  openingTimes: [{ id: 10, label: 'Breakfast', days: 'Mon – Sun', opens: '07:30:00' }],
};

const entries = [
  {
    documentId: 'bistro',
    id: 2,
    name: 'Le Petit Bistro',
    openingTimes: [
      { id: 20, label: 'Weekdays', days: 'Mon – Fri' },
      { id: 21, label: 'Saturday', days: 'Sat' },
    ],
  },
  {
    documentId: 'anna',
    id: 3,
    name: 'La Table d’Anna',
    openingTimes: [{ id: 30, label: 'All week', days: 'Mon – Sun' }],
  },
  { documentId: 'kaze', id: 4, name: 'Sushi Kaze', openingTimes: [] },
];

const mockGetDocuments = jest.fn();
const mockGetDocument = jest.fn();

jest.mock('../../../../../../services/documents', () => ({
  useLazyGetAllDocumentsQuery: () => [
    mockGetDocuments,
    { data: { results: entries }, isFetching: false, isUninitialized: false },
  ],
  useLazyGetDocumentQuery: () => [mockGetDocument, { isFetching: false }],
}));

jest.mock('../../../../../../services/relations', () => ({
  useLazyGetAllRelationsQuery: () => [jest.fn()],
}));

jest.mock('../../../../../../hooks/useDocumentContext', () => ({
  useDocumentContext: () => ({
    currentDocument: { document: currentDocument, schema, components, isLoading: false },
    currentDocumentMeta: {
      documentId: 'current',
      model: 'api::restaurant.restaurant',
      collectionType: 'collection-types',
      params: {},
    },
  }),
}));

// The layout is stable across renders in the app, keep it stable here too.
const editLayout = {
  settings: { mainField: 'name' },
  components: {
    'shared.opening-time': {
      settings: { mainField: 'label' },
      layout: [
        [
          { name: 'label', label: 'Label' },
          { name: 'days', label: 'Days' },
        ],
        [{ name: 'opens', label: 'Opens' }],
      ],
    },
  },
};

jest.mock('../../../../../../hooks/useDocumentLayout', () => ({
  useDocumentLayout: () => ({ edit: editLayout }),
}));

describe('ComponentCopyModal', () => {
  beforeEach(() => {
    mockGetDocument.mockImplementation(({ documentId }: { documentId: string }) => ({
      unwrap: () =>
        Promise.resolve({ data: entries.find((entry) => entry.documentId === documentId) }),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const render = (props: Partial<ComponentCopyModalProps> = {}) =>
    renderRTL(
      <ComponentCopyModal
        componentUid="shared.opening-time"
        fieldLabel="openingTimes"
        mode="component"
        onClose={jest.fn()}
        onInsert={jest.fn(() => true)}
        selection="multiple"
        sourceFieldName="openingTimes"
        {...props}
      />,
      {
        renderOptions: {
          wrapper: ({ children }) => (
            <Form initialValues={{ openingTimes: [] }} method="POST" onSubmit={jest.fn()}>
              {children}
            </Form>
          ),
        },
      }
    );

  it('lists the saved version of the current entry first, then the recently updated entries', () => {
    render();

    expect(screen.getByRole('dialog', { name: 'Copy existing openingTimes' })).toBeInTheDocument();
    expect(mockGetDocuments).toHaveBeenCalledWith({
      model: 'api::restaurant.restaurant',
      params: { _q: undefined, page: '1', pageSize: '10', sort: 'updatedAt:DESC' },
    });

    const [current, bistro, anna, kaze] = screen.getAllByRole('button', { pressed: false });

    expect(current).toHaveTextContent('Café Lumière');
    expect(current).toHaveTextContent('This entry');
    expect(current).toHaveTextContent('1 openingTimes · last saved version');
    expect(bistro).toHaveTextContent('Le Petit Bistro');
    expect(bistro).toHaveTextContent('2 openingTimes');
    expect(anna).toHaveTextContent('La Table d’Anna');
    // an entry without the component has nothing to copy
    expect(kaze).toHaveTextContent('No openingTimes yet');
    expect(kaze).toBeDisabled();

    expect(screen.getByText('Pick an entry to see its openingTimes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use content' })).toBeDisabled();
  });

  it('previews the components of the picked entry and inserts the selected ones', async () => {
    const onClose = jest.fn();
    const onInsert = jest.fn(() => true);
    const { user } = render({ onClose, onInsert });

    await user.click(screen.getByRole('button', { name: /Le Petit Bistro/ }));

    expect(mockGetDocument).toHaveBeenCalledWith({
      collectionType: 'collection-types',
      documentId: 'bistro',
      model: 'api::restaurant.restaurant',
      params: {},
    });
    expect(await screen.findByText('Le Petit Bistro · openingTimes')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Weekdays/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Saturday/ })).not.toBeChecked();
    expect(screen.getByText('Mon – Fri')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use content' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));

    expect(screen.getByRole('checkbox', { name: /Weekdays/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Saturday/ })).toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: /Saturday/ }));
    await user.click(screen.getByRole('button', { name: 'Use content' }));

    await waitFor(() =>
      expect(onInsert).toHaveBeenCalledWith([{ label: 'Weekdays', days: 'Mon – Fri' }])
    );
    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByText('1 entry copied from Le Petit Bistro')).toBeInTheDocument();
  });

  it('copies from the saved version of the current entry without loading it', async () => {
    const onInsert = jest.fn(() => true);
    const { user } = render({ onInsert });

    await user.click(screen.getByRole('button', { name: /Café Lumière/ }));

    expect(mockGetDocument).not.toHaveBeenCalled();
    // the only component is selected right away
    expect(screen.getByRole('checkbox', { name: /Breakfast/ })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Use content' }));

    await waitFor(() =>
      expect(onInsert).toHaveBeenCalledWith([
        { label: 'Breakfast', days: 'Mon – Sun', opens: '07:30:00' },
      ])
    );
    expect(await screen.findByText('1 entry copied from this entry')).toBeInTheDocument();
  });

  it('warns that the content is replaced when the field already holds a component', async () => {
    const onInsert = jest.fn(() => true);
    const { user } = render({ onInsert, replacesContent: true, selection: 'single' });

    expect(
      screen.getByRole('dialog', { name: 'Copy an existing openingTimes' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('This will replace the current content of openingTimes.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /La Table d’Anna/ }));

    expect(await screen.findByText('La Table d’Anna · openingTimes')).toBeInTheDocument();
    // in the entry list and in the preview
    expect(screen.getAllByText('All week')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Replace content' }));

    await waitFor(() =>
      expect(onInsert).toHaveBeenCalledWith([{ label: 'All week', days: 'Mon – Sun' }])
    );
    expect(
      await screen.findByText('openingTimes replaced with content from La Table d’Anna')
    ).toBeInTheDocument();
  });
});
