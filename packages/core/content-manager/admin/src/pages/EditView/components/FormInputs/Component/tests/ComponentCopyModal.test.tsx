import { Form, useForm } from '@strapi/admin/strapi-admin';
import { fireEvent, render as renderRTL, screen, waitFor } from '@tests/utils';

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
  'shared.seo': {
    uid: 'shared.seo',
    category: 'shared',
    info: { displayName: 'SEO' },
    attributes: {
      title: { type: 'string' },
      indexable: { type: 'boolean', default: false },
      categories: { type: 'relation', relation: 'oneToMany', target: 'api::category.category' },
    },
  },
};

const schema = {
  uid: 'api::restaurant.restaurant',
  attributes: {
    name: { type: 'string' },
    openingTimes: { type: 'component', component: 'shared.opening-time', repeatable: true },
    seo: { type: 'component', component: 'shared.seo', repeatable: false },
    blocks: { type: 'dynamiczone', components: ['shared.opening-time', 'shared.seo'] },
  },
};

const mockCurrentDocument = {
  documentId: 'current',
  id: 1,
  name: 'Café Lumière',
  openingTimes: [{ id: 10, label: 'Breakfast', days: 'Mon – Sun', opens: '07:30:00' }],
  seo: { id: 50, title: 'Café SEO', indexable: true, categories: { count: 1 } },
  blocks: [],
};

const mockEntries = [
  {
    documentId: 'bistro',
    id: 2,
    name: 'Le Petit Bistro',
    openingTimes: [
      { id: 20, label: 'Weekdays', days: 'Mon – Fri' },
      { id: 21, label: 'Saturday', days: 'Sat' },
    ],
    seo: { id: 51, title: 'Bistro SEO', indexable: true, categories: { count: 2 } },
    blocks: [
      { __component: 'shared.opening-time', id: 60, label: 'Block hours', days: 'Mon' },
      { __component: 'shared.seo', id: 61, title: 'Bistro block SEO', categories: { count: 0 } },
    ],
  },
  {
    documentId: 'anna',
    id: 3,
    name: 'La Table d’Anna',
    openingTimes: [{ id: 30, label: 'All week', days: 'Mon – Sun' }],
    seo: { id: 70, title: 'Anna SEO', indexable: false, categories: { count: 0 } },
    blocks: [],
  },
  { documentId: 'kaze', id: 4, name: 'Sushi Kaze', openingTimes: [], seo: null, blocks: [] },
];

const mockGetDocuments = jest.fn();
const mockGetDocument = jest.fn();
let mockIsFetchingDocument = false;
const mockGetAllRelations = jest.fn();

jest.mock('../../../../../../services/documents', () => {
  const { useCallback, useState } = jest.requireActual('react');

  return {
    /**
     * The list follows the search, like the API does.
     */
    useLazyGetAllDocumentsQuery: () => {
      const [search, setSearch] = useState('');
      const getDocuments = useCallback((args: { params: { _q?: string } }) => {
        mockGetDocuments(args);
        setSearch(args.params._q?.toLowerCase() ?? '');
      }, []);
      const results = search
        ? mockEntries.filter((entry) => entry.name.toLowerCase().includes(search))
        : mockEntries;

      return [getDocuments, { data: { results }, isFetching: false, isUninitialized: false }];
    },
    useLazyGetDocumentQuery: () => [mockGetDocument, { isFetching: mockIsFetchingDocument }],
  };
});

jest.mock('../../../../../../services/relations', () => ({
  useLazyGetAllRelationsQuery: () => [mockGetAllRelations],
}));

// Stable across renders like in the app: the entries are fetched again when `params` changes.
const mockDocumentContext = {
  currentDocument: { document: mockCurrentDocument, schema, components, isLoading: false },
  currentDocumentMeta: {
    documentId: 'current',
    model: 'api::restaurant.restaurant',
    collectionType: 'collection-types',
    params: {},
  },
};

jest.mock('../../../../../../hooks/useDocumentContext', () => ({
  useDocumentContext: () => mockDocumentContext,
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
    'shared.seo': {
      settings: { mainField: 'title' },
      layout: [
        [
          { name: 'title', label: 'Title' },
          { name: 'indexable', label: 'Indexable' },
        ],
        [{ name: 'categories', label: 'Categories' }],
      ],
    },
  },
};

jest.mock('../../../../../../hooks/useDocumentLayout', () => ({
  useDocumentLayout: () => ({ edit: editLayout }),
}));

const relations = [
  { id: 1, documentId: 'cat-1', locale: 'en', status: 'published', name: 'Starters' },
  { id: 2, documentId: 'cat-2', locale: 'en', status: 'draft', name: 'Mains' },
];

/**
 * Makes the form dirty the way editing any field does.
 */
const EditButton = () => {
  const onChange = useForm('EditButton', (state) => state.onChange);

  return (
    <button type="button" onClick={() => onChange('name', 'Café Lumière (edited)')}>
      Edit the entry
    </button>
  );
};

describe('ComponentCopyModal', () => {
  beforeEach(() => {
    mockGetDocument.mockImplementation(({ documentId }: { documentId: string }) =>
      Promise.resolve({
        data: { data: mockEntries.find((entry) => entry.documentId === documentId) },
      })
    );
    mockGetAllRelations.mockImplementation(() => ({
      unwrap: () => Promise.resolve(relations),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockIsFetchingDocument = false;
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
            <Form
              initialValues={{ name: 'Café Lumière', openingTimes: [], seo: null, blocks: [] }}
              method="PUT"
              onSubmit={jest.fn()}
            >
              <EditButton />
              {children}
            </Form>
          ),
        },
      }
    );

  const renderForSingleComponent = (props: Partial<ComponentCopyModalProps> = {}) =>
    render({
      componentUid: 'shared.seo',
      fieldLabel: 'seo',
      selection: 'single',
      sourceFieldName: 'seo',
      ...props,
    });

  describe('repeatable component', () => {
    it('lists the saved version of the current entry first, then the recently updated entries', () => {
      render();

      expect(
        screen.getByRole('dialog', { name: 'Copy existing openingTimes' })
      ).toBeInTheDocument();
      expect(mockGetDocuments).toHaveBeenCalledWith({
        model: 'api::restaurant.restaurant',
        params: { _q: undefined, page: '1', pageSize: '10', sort: 'updatedAt:DESC' },
      });

      const [current, bistro, anna, kaze] = screen.getAllByRole('button', { pressed: false });

      expect(current).toHaveTextContent('Café Lumière');
      expect(current).toHaveTextContent('This entry');
      expect(current).toHaveTextContent('1 item · last saved version');
      expect(bistro).toHaveTextContent('Le Petit Bistro');
      expect(bistro).toHaveTextContent('2 items');
      expect(anna).toHaveTextContent('La Table d’Anna');
      expect(anna).toHaveTextContent('1 item');
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
      // the checkboxes are named after the title of the component, not its whole preview
      expect(screen.getByRole('checkbox', { name: 'Weekdays' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Saturday' })).not.toBeChecked();
      expect(screen.getByText('Mon – Fri')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Use content' })).toBeDisabled();

      await user.click(screen.getByRole('checkbox', { name: 'Select all' }));

      expect(screen.getByRole('checkbox', { name: 'Weekdays' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Saturday' })).toBeChecked();
      expect(screen.getByRole('button', { name: 'Use content from 2 items' })).toBeEnabled();

      await user.click(screen.getByRole('checkbox', { name: 'Saturday' }));
      await user.click(screen.getByRole('button', { name: 'Use content' }));

      await waitFor(() =>
        expect(onInsert).toHaveBeenCalledWith([{ label: 'Weekdays', days: 'Mon – Fri' }])
      );
      expect(mockGetAllRelations).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(await screen.findByText('1 entry copied from Le Petit Bistro')).toBeInTheDocument();
    });

    it('copies from the saved version of the current entry without loading it', async () => {
      const onInsert = jest.fn(() => true);
      const { user } = render({ onInsert });

      await user.click(screen.getByRole('button', { name: /Café Lumière/ }));

      expect(mockGetDocument).not.toHaveBeenCalled();
      // the only component is selected right away
      expect(screen.getByRole('checkbox', { name: 'Breakfast' })).toBeChecked();

      await user.click(screen.getByRole('button', { name: 'Use content' }));

      await waitFor(() =>
        expect(onInsert).toHaveBeenCalledWith([
          { label: 'Breakfast', days: 'Mon – Sun', opens: '07:30:00' },
        ])
      );
      expect(await screen.findByText('1 entry copied from this entry')).toBeInTheDocument();
    });

    it('does not offer the current entry while the form has unsaved changes', () => {
      render();

      expect(screen.getByRole('button', { name: /Café Lumière/ })).toBeEnabled();

      // the form is behind the modal, out of reach of the user
      fireEvent.click(screen.getByRole('button', { name: 'Edit the entry', hidden: true }));

      const current = screen.getByRole('button', { name: /Café Lumière/ });

      expect(current).toBeDisabled();
      expect(current).toHaveTextContent('Save your changes to copy from this entry');
    });

    it('keeps the picked entry while the search filters it out of the list', async () => {
      const onInsert = jest.fn(() => true);
      const { user } = render({ onInsert });

      await user.click(screen.getByRole('button', { name: /Le Petit Bistro/ }));
      await screen.findByText('Le Petit Bistro · openingTimes');

      await user.type(screen.getByRole('searchbox'), 'anna');

      // the search is debounced
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /Le Petit Bistro/ })).not.toBeInTheDocument()
      );
      expect(screen.getByRole('button', { name: /La Table d’Anna/ })).toBeInTheDocument();
      expect(screen.queryByText('Recently updated entries')).not.toBeInTheDocument();
      expect(screen.getByText('Le Petit Bistro · openingTimes')).toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: 'Weekdays' }));
      await user.click(screen.getByRole('button', { name: 'Use content' }));

      expect(await screen.findByText('1 entry copied from Le Petit Bistro')).toBeInTheDocument();
      expect(onInsert).toHaveBeenCalledTimes(1);
    });

    it('does not let more components be selected than the field can take', async () => {
      const onInsert = jest.fn(() => true);
      const { user } = render({ onInsert, maxSelection: 1 });

      await user.click(screen.getByRole('button', { name: /Le Petit Bistro/ }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select all' }));

      expect(screen.getByRole('button', { name: 'Use content from 2 items' })).toBeDisabled();
      expect(
        screen.getByText('You can add 1 more item to openingTimes. Unselect 1 item.')
      ).toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: 'Saturday' }));

      expect(screen.getByRole('button', { name: 'Use content' })).toBeEnabled();
      expect(
        screen.getByText('The content is copied: editing it here won’t change the original entry.')
      ).toBeInTheDocument();
    });

    it('closes without a success message when the field turns the copies down', async () => {
      const onClose = jest.fn();
      const onInsert = jest.fn(() => false);
      const { user } = render({ onClose, onInsert });

      await user.click(screen.getByRole('button', { name: /La Table d’Anna/ }));
      await user.click(await screen.findByRole('button', { name: 'Use content' }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(onInsert).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/copied from/)).not.toBeInTheDocument();
    });

    it('reports an entry that cannot be loaded and lets another one be picked', async () => {
      mockGetDocument.mockImplementationOnce(() =>
        Promise.resolve({
          error: { name: 'ApplicationError', message: 'Entry not found', details: {} },
        })
      );
      const { user } = render();

      await user.click(screen.getByRole('button', { name: /Le Petit Bistro/ }));

      expect(await screen.findByText('Entry not found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Le Petit Bistro/ })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
      expect(screen.getByText('Pick an entry to see its openingTimes.')).toBeInTheDocument();
    });

    it('keeps the focus on the picked entry while it loads', async () => {
      mockIsFetchingDocument = true;

      const { user } = render();

      const bistro = await screen.findByRole('button', { name: /Le Petit Bistro/ });

      // not `disabled`, which would drop the focus of the entry that was just picked
      expect(bistro).toHaveAttribute('aria-disabled', 'true');
      expect(bistro).toBeEnabled();

      await user.click(bistro);

      expect(bistro).toHaveFocus();
      expect(mockGetDocument).not.toHaveBeenCalled();
    });
  });

  describe('single component', () => {
    it('lists the entries by the title of their component and previews the picked one', async () => {
      const onInsert = jest.fn(() => true);
      const { user } = renderForSingleComponent({ onInsert, replacesContent: true });

      expect(screen.getByRole('dialog', { name: 'Copy an existing seo' })).toBeInTheDocument();
      expect(screen.getByText('This will replace the current content of seo.')).toBeInTheDocument();

      const [current, bistro, anna, kaze] = screen.getAllByRole('button', { pressed: false });

      // the field already holds the saved version of its own component
      expect(current).toHaveTextContent('No other seo in this entry');
      expect(current).toBeDisabled();
      expect(bistro).toHaveTextContent('Bistro SEO');
      expect(anna).toHaveTextContent('Anna SEO');
      expect(kaze).toHaveTextContent('No seo yet');
      expect(kaze).toBeDisabled();

      await user.click(anna);

      expect(await screen.findByText('La Table d’Anna · seo')).toBeInTheDocument();
      // in the entry list and in the preview
      expect(screen.getAllByText('Anna SEO')).toHaveLength(2);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Replace content' }));

      await waitFor(() =>
        expect(onInsert).toHaveBeenCalledWith([
          { title: 'Anna SEO', indexable: false, categories: { connect: [], disconnect: [] } },
        ])
      );
      expect(
        await screen.findByText('seo replaced with content from La Table d’Anna')
      ).toBeInTheDocument();
    });

    it('loads the relations of the copied component and connects them', async () => {
      const onInsert = jest.fn(() => true);
      const { user } = renderForSingleComponent({ onInsert });

      await user.click(screen.getByRole('button', { name: /Le Petit Bistro/ }));
      await user.click(await screen.findByRole('button', { name: 'Use content' }));

      await waitFor(() =>
        expect(onInsert).toHaveBeenCalledWith([
          {
            title: 'Bistro SEO',
            indexable: true,
            categories: {
              connect: [
                {
                  ...relations[0],
                  apiData: { id: 1, documentId: 'cat-1', locale: 'en' },
                  __temp_key__: 'a0',
                },
                {
                  ...relations[1],
                  apiData: { id: 2, documentId: 'cat-2', locale: 'en' },
                  __temp_key__: 'a1',
                },
              ],
              disconnect: [],
            },
          },
        ])
      );
      expect(mockGetAllRelations).toHaveBeenCalledWith({
        model: 'shared.seo',
        id: 51,
        targetField: 'categories',
        params: {},
      });
      expect(await screen.findByText('seo copied from Le Petit Bistro')).toBeInTheDocument();
    });

    it('still copies the component when its relations cannot be loaded, and says so', async () => {
      mockGetAllRelations.mockImplementation(() => ({
        unwrap: () => Promise.reject(new Error('Forbidden')),
      }));
      const onInsert = jest.fn(() => true);
      const { user } = renderForSingleComponent({ onInsert });

      await user.click(screen.getByRole('button', { name: /Le Petit Bistro/ }));
      await user.click(await screen.findByRole('button', { name: 'Use content' }));

      await waitFor(() =>
        expect(onInsert).toHaveBeenCalledWith([
          { title: 'Bistro SEO', indexable: true, categories: { connect: [], disconnect: [] } },
        ])
      );
      expect(
        await screen.findByText('Content copied, but some of its relations could not be loaded.')
      ).toBeInTheDocument();
      expect(screen.queryByText(/copied from/)).not.toBeInTheDocument();
    });
  });

  describe('dynamic zone', () => {
    it('only offers the blocks made of the wanted component and tags the copies with it', async () => {
      const onInsert = jest.fn(() => true);
      const { user } = render({
        componentUid: 'shared.opening-time',
        fieldLabel: 'Opening time',
        mode: 'dynamiczone',
        onInsert,
        sourceFieldName: 'blocks',
      });

      const [current, bistro, anna] = screen.getAllByRole('button', { pressed: false });

      expect(current).toHaveTextContent('No Opening time yet');
      expect(current).toBeDisabled();
      expect(bistro).toHaveTextContent('1 item');
      expect(anna).toBeDisabled();

      await user.click(bistro);

      // the SEO block of the entry is left out, the only matching block is selected right away
      expect(await screen.findByRole('checkbox', { name: 'Block hours' })).toBeChecked();
      expect(screen.queryByText('Bistro block SEO')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Use content' }));

      await waitFor(() =>
        expect(onInsert).toHaveBeenCalledWith([
          { __component: 'shared.opening-time', label: 'Block hours', days: 'Mon' },
        ])
      );
      expect(
        await screen.findByText('1 Opening time component copied from Le Petit Bistro')
      ).toBeInTheDocument();
    });
  });
});
