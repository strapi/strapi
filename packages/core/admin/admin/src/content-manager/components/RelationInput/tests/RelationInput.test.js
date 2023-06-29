import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { RelationInput } from '../index';

const FIXTURES_RELATIONS = {
  data: [
    {
      id: 1,
      href: '/',
      mainField: 'Relation 1',
      publicationState: 'draft',
    },
    {
      id: 2,
      href: '',
      mainField: 'Relation 2',
      publicationState: 'published',
    },
    {
      id: 3,
      href: '',
      mainField: 'Relation 3',
      publicationState: false,
    },
  ],
  isLoading: false,
  isSuccess: true,
  hasNextPage: true,
  isFetchingNextPage: false,
};

const FIXTURES_SEARCH = {
  data: [
    {
      id: 4,
      mainField: 'Relation 4',
      publicationState: 'draft',
    },
  ],
  isLoading: false,
  isSuccess: true,
};

const Component = (props) => (
  <MemoryRouter>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en">
        <DndProvider backend={HTML5Backend}>
          <RelationInput
            canReorder
            description="this is a description"
            iconButtonAriaLabel="Drag"
            id="1"
            name="some-relation-1"
            label="Some Relation"
            labelLoadMore="Load more"
            listAriaDescription="Press spacebar to grab and re-order"
            loadingMessage="Relations are loading"
            labelDisconnectRelation="Remove"
            numberOfRelationsToDisplay={5}
            noRelationsMessage="No relations available"
            onRelationConnect={() => jest.fn()}
            onRelationDisconnect={() => jest.fn()}
            onRelationLoadMore={() => jest.fn()}
            onRelationReorder={() => jest.fn()}
            onSearch={() => jest.fn()}
            onSearchNextPage={() => jest.fn()}
            placeholder="Select..."
            publicationStateTranslations={{
              draft: 'Draft',
              published: 'Published',
            }}
            relations={FIXTURES_RELATIONS}
            searchResults={FIXTURES_SEARCH}
            size={8}
            {...props}
          />
        </DndProvider>
      </IntlProvider>
    </ThemeProvider>
  </MemoryRouter>
);

const setup = (props) => ({
  ...render(<Component {...props} />),
  user: userEvent.setup(),
});

describe('Content-Manager || RelationInput', () => {
  test('should render and match snapshot', () => {
    const { container, getByText, getByRole } = setup();

    expect(container).toMatchSnapshot();
    expect(getByText('Some Relation')).toBeInTheDocument();
    expect(getByText('Load more')).toBeInTheDocument();
    expect(getByRole('combobox')).toBeInTheDocument();
    expect(
      getByRole('link', {
        name: /relation 1/i,
      })
    ).toBeInTheDocument();
  });

  describe('Callbacks', () => {
    test('should call onSearch', async () => {
      const spy = jest.fn();
      const { user, getByRole } = setup({ onSearch: spy });

      await user.click(getByRole('combobox'));

      expect(spy).toHaveBeenCalled();
    });

    test('should call onRelationConnect', async () => {
      const onAddSpy = jest.fn();
      const { user, getByText, getByRole } = setup({ onRelationConnect: onAddSpy });

      await user.click(getByRole('combobox'));
      expect(getByText('Relation 4')).toBeInTheDocument();

      await user.click(getByText('Relation 4'));

      expect(onAddSpy).toHaveBeenCalled();
    });

    test('should call onRelationDisconnect', async () => {
      const spy = jest.fn();
      const { user, getByTestId } = setup({ onRelationDisconnect: spy });

      await user.click(getByTestId('remove-relation-1'));

      expect(spy).toHaveBeenCalled();
    });

    test('should call onRelationLoadMore', async () => {
      const onRelationLoadMoreSpy = jest.fn();
      const { user, getByText } = setup({ onRelationLoadMore: onRelationLoadMoreSpy });

      await user.click(getByText('Load more'));

      expect(onRelationLoadMoreSpy).toHaveBeenCalled();
    });

    test('should call onSearch', async () => {
      const spy = jest.fn();
      const { user, getByRole } = setup({ onSearch: spy });

      await user.type(getByRole('combobox'), 'searching');
      expect(spy).toHaveBeenCalled();
    });

    test('should call onRelationReorder', () => {
      const spy = jest.fn();
      const { getAllByText } = setup({ onRelationReorder: spy });

      const [draggedItem, dropZone] = getAllByText('Drag');

      fireEvent.dragStart(draggedItem);
      fireEvent.dragEnter(dropZone);
      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone);

      expect(spy).toHaveBeenCalled();
    });

    it('should not call onRelationReorder when the indices are the same', () => {
      const spy = jest.fn();
      const { getAllByText } = setup({ onRelationReorder: spy });

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowUp', code: 'ArrowUp' });

      expect(spy).not.toHaveBeenCalled();
    });

    test('should scroll to the bottom when a new relation has been added & scroll to the top when load more is clicked', async () => {
      const data = [
        ...FIXTURES_RELATIONS.data,
        { id: 4, mainField: 'Relation 4', publicationState: 'draft' },
        { id: 5, mainField: 'Relation 5', publicationState: 'draft' },
      ];

      const newRelation = { id: 6, mainField: 'Relation 6', publicationState: 'draft' };

      const { user, rerender, getByRole, getByText } = setup({
        relations: {
          ...FIXTURES_RELATIONS,
          data,
        },
        searchResults: {
          ...FIXTURES_SEARCH,
          data: [newRelation],
        },
      });

      expect(getByRole('list').parentNode.scrollTop).toBe(0);

      await user.click(getByRole('combobox'));

      expect(getByText('Relation 6')).toBeInTheDocument();

      await user.click(getByText('Relation 6'));

      rerender(
        <Component
          relations={{
            ...FIXTURES_RELATIONS,
            data: [...data, newRelation],
          }}
        />
      );

      await waitFor(() => expect(getByRole('list').parentNode.scrollTop).toBeGreaterThan(0));

      fireEvent.click(getByText('Load more'));

      rerender(
        <Component
          relations={{
            ...FIXTURES_RELATIONS,
            data: [
              { id: 7, mainField: 'Relation 7', publicationState: false },
              ...data,
              newRelation,
            ],
          }}
        />
      );

      await waitFor(() => expect(getByRole('list').parentNode.scrollTop).toBe(0));
    });

    // TODO: check if it is possible to fire scroll event here
    // test.only('should call onSearchNextPage', () => {
    //   const spy = jest.fn();
    //   const { container } = setup({ onSearchNextPage: spy });

    //   fireEvent.mouseDown(getByRole('combobox'));
    //   fireEvent.scroll(getByText('Relation 4'), {
    //     not working with scrollY either
    //     target: { scrollBottom: 100 },
    //   });

    //   expect(spy).toHaveBeenCalled();
    // });
  });

  describe('States', () => {
    test('should display search loading state', async () => {
      const { user, getByText, getByRole } = setup({
        searchResults: { data: [], isLoading: true, isSuccess: true },
      });

      await user.click(getByRole('combobox'));

      expect(getByText('Relations are loading')).toBeInTheDocument();
    });

    test('should display load more button loading if loading is true', () => {
      const { getByRole } = setup({
        relations: {
          data: [],
          isLoading: true,
          isSuccess: true,
          hasNextPage: true,
          isFetchingNextPage: false,
        },
      });

      expect(getByRole('button', { name: /load more/i })).toHaveAttribute('aria-disabled', 'true');
    });

    test('should not display load more button loading if there is no next page', () => {
      const { queryByText } = setup({
        relations: {
          data: [],
          isLoading: false,
          isSuccess: true,
          hasNextPage: false,
          isFetchingNextPage: false,
        },
      });

      expect(queryByText('Load more')).not.toBeInTheDocument();
    });

    test('should display error state', () => {
      const { getByText } = setup({ error: 'This is an error' });

      expect(getByText('This is an error')).toBeInTheDocument();
    });

    test('should display disabled state with only read permission', async () => {
      const onRelationLoadMoreSpy = jest.fn();
      const { user, getAllByRole, getByRole, getByTestId, getByText, container } = setup({
        disabled: true,
        onRelationLoadMore: onRelationLoadMoreSpy,
      });

      await user.click(getByText('Load more'));
      expect(onRelationLoadMoreSpy).toHaveBeenCalledTimes(1);

      expect(container.querySelector('input')).toBeDisabled();
      expect(getByTestId('remove-relation-1')).toBeDisabled();
      const [dragButton] = getAllByRole('button', { name: 'Drag' });
      expect(dragButton).toHaveAttribute('aria-disabled', 'true');
      expect(getByRole('link', { name: 'Relation 1' })).toBeInTheDocument();
    });
  });
});
