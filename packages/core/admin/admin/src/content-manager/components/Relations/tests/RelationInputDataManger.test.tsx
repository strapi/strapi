/* eslint-disable testing-library/no-node-access */
import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import {
  RelationInputDataManager,
  RelationInputDataManagerProps,
} from '../RelationInputDataManager';
import { useRelation } from '../useRelation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

jest.mock('../useRelation', () => ({
  useRelation: jest.fn().mockReturnValue({
    relations: {
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
      isSuccess: true,
      status: 'success',
    },
    search: {
      data: {
        pages: [
          {
            results: [
              {
                id: '11',
                title: 'Search 1',
              },

              {
                id: '22',
                title: 'Search 2',
              },
            ],
          },
        ],
      },
      isFetchingNextPage: false,
      isLoading: false,
      isSuccess: true,
      status: 'success',
    },

    searchFor: jest.fn(),
  }),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockReturnValue({
    isCreatingEntry: true,
    createActionAllowedFields: ['relation'],
    readActionAllowedFields: ['relation'],
    updateActionAllowedFields: ['relation'],
    slug: 'test',
    initialData: {
      relation: [
        {
          id: '1',
          __temp_key__: 1,
          mainField: 'Relation 1',
          name: 'Relation 1',
        },

        {
          id: '2',
          __temp_key__: 2,
          mainField: 'Relation 2',
          name: 'Relation 2',
        },
      ],
    },
    modifiedData: {
      relation: [
        {
          id: '1',
          __temp_key__: 1,
          mainField: 'Relation 1',
          name: 'Relation 1',
        },

        {
          id: '2',
          __temp_key__: 2,
          mainField: 'Relation 2',
          name: 'Relation 2',
        },
      ],
    },
    relationLoad: jest.fn(),
    relationConnect: jest.fn(),
    relationDisconnect: jest.fn(),
    relationReorder: jest.fn(),
  }),
}));

const RelationInputDataManagerComponent = (props?: Partial<RelationInputDataManagerProps>) => (
  <RelationInputDataManager
    description="Description"
    intlLabel={{
      id: 'label',
      defaultMessage: 'Label',
    }}
    labelAction={<>Action</>}
    mainField={{
      name: 'relation',
      // @ts-expect-error - mock
      schema: {
        type: 'relation',
      },
    }}
    name="relation"
    placeholder={{
      id: 'placeholder',
      defaultMessage: 'Placeholder',
    }}
    relationType="oneToOne"
    size={6}
    targetModel="something"
    editable
    queryInfos={{
      shouldDisplayRelationLink: true,
    }}
    {...props}
  />
);

const setup = (props?: Partial<RelationInputDataManagerProps>) => ({
  ...render(<RelationInputDataManagerComponent {...props} />, {
    wrapper: ({ children }) => (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={lightTheme}>
            <DndProvider backend={HTML5Backend}>
              <IntlProvider locale="en">{children}</IntlProvider>
            </DndProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  }),
  user: userEvent.setup(),
});

describe('RelationInputDataManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Does pass through props from the CM', async () => {
    const { findByText, getByRole } = setup();

    expect(await findByText(/Label/)).toBeInTheDocument();
    expect(await findByText('Description')).toBeInTheDocument();
    expect(await findByText('Action')).toBeInTheDocument();
    expect(getByRole('combobox')).toBeInTheDocument();
  });

  test('Does pass through an error from the CM', async () => {
    const { findByText } = setup({
      error: 'Error',
    });

    expect(await findByText('Error')).toBeInTheDocument();
  });

  test('Sets the disabled prop for morphed relations', async () => {
    const { container } = setup({
      relationType: 'morph',
    });

    expect(container.querySelector('input')).toHaveAttribute('disabled');
  });

  test('Passes down defaultParams to the relation and search endpoints', async () => {
    setup({
      queryInfos: {
        defaultParams: {
          something: true,
        },
        shouldDisplayRelationLink: true,
      },
    });

    expect(useRelation).toBeCalledWith(
      expect.arrayContaining([expect.any(String)]),
      expect.objectContaining({
        search: expect.objectContaining({
          pageParams: expect.objectContaining({
            something: true,
          }),
        }),
        relation: expect.objectContaining({
          pageParams: expect.objectContaining({
            something: true,
          }),
        }),
      })
    );
  });

  test('Sets the disabled prop for non editable relations (edit entity)', async () => {
    const { container } = setup({
      editable: false,
    });

    expect(container.querySelector('input')).toHaveAttribute('disabled');
  });

  test('Sets the disabled prop for non editable relations (create entity)', async () => {
    const { container } = setup({
      editable: false,
    });

    expect(container.querySelector('input')).toHaveAttribute('disabled');
  });

  test('Sets the disabled prop if the user does not have all permissions', async () => {
    // @ts-expect-error - mock
    useCMEditViewDataManager.mockReturnValueOnce({
      isCreatingEntry: false,
      createActionAllowedFields: [],
      readActionAllowedFields: ['relation'],
      updateActionAllowedFields: [],
      slug: 'test',
      initialData: {},
      modifiedData: {},
      relationLoad: jest.fn(),
    });

    const { container } = setup();

    expect(container.querySelector('input')).toHaveAttribute('disabled');
  });

  test('Renders <NotAllowedInput /> if entity is created and field is not allowed', async () => {
    // @ts-expect-error - mock
    useCMEditViewDataManager.mockReturnValueOnce({
      isCreatingEntry: true,
      createActionAllowedFields: [],
      readActionAllowedFields: [],
      updateActionAllowedFields: [],
      slug: 'test',
      initialData: {},
      modifiedData: {},
      relationLoad: jest.fn(),
    });

    const { container } = setup();

    expect(container.querySelector('input')).toHaveAttribute(
      'placeholder',
      'No permissions to see this field'
    );
  });

  test('Renders <NotAllowedInput /> if entity is edited and field is not allowed and not readable', async () => {
    // @ts-expect-error - mock
    useCMEditViewDataManager.mockReturnValueOnce({
      isCreatingEntry: false,
      createActionAllowedFields: [],
      readActionAllowedFields: [],
      updateActionAllowedFields: [],
      slug: 'test',
      initialData: {},
      modifiedData: {},
      relationLoad: jest.fn(),
    });

    const { container } = setup();

    expect(container.querySelector('input')).toHaveAttribute(
      'placeholder',
      'No permissions to see this field'
    );
  });

  // we can assume relations have been normalized properly, if the title
  // attribute was copied into the mainField of a relation and rendered
  test('Normalizes relations', async () => {
    const { findAllByText } = setup({
      mainField: {
        name: 'title',
        // @ts-expect-error - mock
        schema: {
          type: 'relation',
        },
      },
    });

    const nodes = await findAllByText('Relation 1');

    // ever relation has an associated tooltip
    expect(nodes.length).toBe(2);
    expect(nodes[0]).toBeInTheDocument();
  });

  test('Disconnect new entity', async () => {
    const { relationDisconnect } = useCMEditViewDataManager();
    const { findByTestId, user } = setup();

    await user.click(await findByTestId('remove-relation-1'));

    expect(jest.mocked(relationDisconnect)?.mock.calls[0]).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "name": "relation",
        },
      ]
    `);
  });

  test('Do not render Load More when an entity is created', () => {
    const { queryByText } = setup();

    expect(queryByText('Load More')).not.toBeInTheDocument();
  });

  test('Load more entities', async () => {
    // @ts-expect-error fix
    const { relations } = useRelation();

    // @ts-expect-error - mock
    useCMEditViewDataManager.mockReturnValueOnce({
      isCreatingEntry: false,
      createActionAllowedFields: ['relation'],
      readActionAllowedFields: ['relation'],
      updateActionAllowedFields: ['relation'],
      slug: 'test',
      initialData: {},
      modifiedData: {},
      relationLoad: jest.fn(),
    });

    const { getByText, user } = setup();
    const loadMoreNode = getByText('Load More');

    expect(loadMoreNode).toBeInTheDocument();

    await user.click(loadMoreNode);

    expect(relations.fetchNextPage).toBeCalledTimes(1);
  });

  test('Open search', async () => {
    // @ts-expect-error – TODO: fix
    const { searchFor } = useRelation();
    const { user, getByRole } = setup();

    await user.click(getByRole('combobox'));

    expect(searchFor).toBeCalledWith('', { idsToInclude: [], idsToOmit: [] });
  });

  test('Connect new entity', async () => {
    const { relationConnect } = useCMEditViewDataManager();
    const { user, findByText, getByRole } = setup({
      mainField: {
        name: 'title',
        // @ts-expect-error - mock
        schema: {
          type: 'relation',
        },
      },
    });

    await user.type(getByRole('combobox'), 'S');

    await user.click(await findByText('Search 1'));

    expect(relationConnect).toBeCalledWith(
      expect.objectContaining({
        name: expect.any(String),
        toOneRelation: expect.any(Boolean),
        value: expect.objectContaining({
          id: '11',
        }),
      })
    );
  });

  test('Reorder an entity', () => {
    const { relationReorder } = useCMEditViewDataManager();
    const { getAllByText } = setup({ relationType: 'manyToMany' });

    const [draggedItem, dropZone] = getAllByText('Drag');

    fireEvent.dragStart(draggedItem);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone);

    expect(relationReorder).toBeCalledWith({ name: 'relation', newIndex: 1, oldIndex: 0 });
  });

  describe('Accessibility', () => {
    it('should have have description text', () => {
      const { getByText } = setup({ relationType: 'manyToMany' });

      expect(getByText('Press spacebar to grab and re-order')).toBeInTheDocument();
    });

    it('should update the live text when an item has been grabbed', async () => {
      const { getByText, getAllByText } = setup({ relationType: 'manyToMany' });

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });

      expect(
        getByText(/Press up and down arrow to change position, Spacebar to drop, Escape to cancel/)
      ).toBeInTheDocument();
    });

    it('should change the live text when an item has been moved', () => {
      const { getByText, getAllByText } = setup({ relationType: 'manyToMany' });

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });

      expect(getByText(/New position in list/)).toBeInTheDocument();
    });

    it('should change the live text when an item has been dropped', () => {
      const { getByText, getAllByText } = setup({ relationType: 'manyToMany' });

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });

      expect(getByText(/Final position in list/)).toBeInTheDocument();
    });

    it('should change the live text after the reordering interaction has been cancelled', () => {
      const { getAllByText, getByText } = setup({ relationType: 'manyToMany' });

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'Escape', code: 'Escape' });

      expect(getByText(/Re-order cancelled/)).toBeInTheDocument();
    });
  });

  describe('Counting relations', () => {
    it('should not render a count value when there are no relations', () => {
      // @ts-expect-error - mock
      useCMEditViewDataManager.mockImplementation(() => ({
        isCreatingEntry: false,
        createActionAllowedFields: ['relation'],
        readActionAllowedFields: ['relation'],
        updateActionAllowedFields: ['relation'],
        slug: 'test',
        initialData: {
          relation: [],
        },
        modifiedData: {
          relation: [],
        },
      }));

      const { queryByText } = setup();

      expect(queryByText(/\([0-9]\)/)).not.toBeInTheDocument();
    });

    it('should render a count value when there are relations added to the store but no relations from useRelation', () => {
      // @ts-expect-error - mock
      useCMEditViewDataManager.mockImplementation(() => ({
        isCreatingEntry: false,
        createActionAllowedFields: ['relation'],
        readActionAllowedFields: ['relation'],
        updateActionAllowedFields: ['relation'],
        slug: 'test',
        initialData: {
          relation: [],
        },
        modifiedData: {
          relation: [
            {
              id: '1',
            },
            {
              id: '2',
            },
            {
              id: '3',
            },
          ],
        },
      }));

      const { getByText } = setup();

      expect(getByText(/\(3\)/)).toBeInTheDocument();
    });

    it('should render the count value of the useRelations response when there are relations from useRelation', () => {
      // @ts-expect-error - mock
      useRelation.mockImplementation(() => ({
        relations: {
          data: {
            pages: [
              {
                pagination: {
                  total: 8,
                },
              },
            ],
          },
          hasNextPage: true,
          isFetchingNextPage: false,
          isLoading: false,
          isSuccess: true,
          status: 'success',
        },
        search: {
          data: {},
          isFetchingNextPage: false,
          isLoading: false,
          isSuccess: true,
          status: 'success',
        },
      }));

      // @ts-expect-error - mock
      useCMEditViewDataManager.mockImplementation(() => ({
        isCreatingEntry: false,
        createActionAllowedFields: ['relation'],
        readActionAllowedFields: ['relation'],
        updateActionAllowedFields: ['relation'],
        slug: 'test',
        initialData: {
          relation: [
            {
              id: '1',
            },
          ],
        },
        modifiedData: {
          relation: [
            {
              id: '1',
            },
          ],
        },
      }));

      const { getByText } = setup();

      expect(getByText(/\(8\)/)).toBeInTheDocument();
    });

    it('should not crash, if the field is not set in modifiedData (e.g. in components)', () => {
      // @ts-expect-error - mock
      useCMEditViewDataManager.mockImplementation(() => ({
        isCreatingEntry: false,
        createActionAllowedFields: ['relation'],
        readActionAllowedFields: ['relation'],
        updateActionAllowedFields: ['relation'],
        slug: 'test',
        initialData: {
          relation: [
            {
              id: '1',
            },
          ],
        },
        modifiedData: {},
      }));

      expect(setup).not.toThrow();
    });

    it('should correct calculate browser mutations when there are relations from useRelation', async () => {
      // @ts-expect-error - mock
      useRelation.mockImplementation(() => ({
        relations: {
          data: {
            pages: [
              {
                pagination: {
                  total: 8,
                },
              },
            ],
          },
          hasNextPage: true,
          isFetchingNextPage: false,
          isLoading: false,
          isSuccess: true,
          status: 'success',
        },
        search: {
          data: {},
          isFetchingNextPage: false,
          isLoading: false,
          isSuccess: true,
          status: 'success',
        },
      }));

      // @ts-expect-error - mock
      useCMEditViewDataManager.mockImplementation(() => ({
        isCreatingEntry: false,
        createActionAllowedFields: ['relation'],
        readActionAllowedFields: ['relation'],
        updateActionAllowedFields: ['relation'],
        slug: 'test',
        initialData: {
          relation: [
            {
              id: '1',
            },
          ],
        },
        modifiedData: {
          relation: [
            {
              id: '1',
            },
          ],
        },
      }));

      const { getByText, rerender } = setup();

      expect(getByText(/\(8\)/)).toBeInTheDocument();

      /**
       * Simulate changing the store
       */
      // @ts-expect-error - mock
      useCMEditViewDataManager.mockImplementation(() => ({
        isCreatingEntry: false,
        createActionAllowedFields: ['relation'],
        readActionAllowedFields: ['relation'],
        updateActionAllowedFields: ['relation'],
        slug: 'test',
        initialData: {
          relation: [
            {
              id: '1',
            },
          ],
        },
        modifiedData: {
          relation: [],
        },
      }));

      rerender(<RelationInputDataManagerComponent />);

      expect(getByText(/\(7\)/)).toBeInTheDocument();
    });
  });
});
