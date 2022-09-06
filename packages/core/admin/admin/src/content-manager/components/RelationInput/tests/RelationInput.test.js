import React from 'react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { RelationInput } from '../index';

const FIXTURES_RELATIONS = {
  data: {
    pages: [
      [
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
    ],
  },
  isLoading: false,
  isSuccess: true,
};

const FIXTURES_SEARCH = {
  data: {
    pages: [
      [
        {
          id: 4,
          mainField: 'Relation 4',
          publicationState: 'draft',
        },
      ],
    ],
  },
  isLoading: false,
  isSuccess: true,
};

const setup = (props) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en">
          <RelationInput
            description="this is a description"
            id="1"
            name="some-relation-1"
            label="Some Relation"
            labelLoadMore="Load more"
            loadingMessage="Relations are loading"
            onRelationAdd={() => jest.fn()}
            onSearchOpen={() => jest.fn()}
            onSearchClose={() => jest.fn()}
            onRelationRemove={() => jest.fn()}
            onRelationLoadMore={() => jest.fn()}
            onSearch={() => jest.fn()}
            onSearchNextPage={() => jest.fn()}
            placeholder="Select..."
            publicationStateTranslations={{
              draft: 'Draft',
              published: 'Published',
            }}
            relations={FIXTURES_RELATIONS}
            searchResults={FIXTURES_SEARCH}
            {...props}
          />
        </IntlProvider>
      </ThemeProvider>
    </MemoryRouter>
  );

describe('Content-Manager || RelationInput', () => {
  test('should render and match snapshot', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
    expect(screen.getByText('Some Relation')).toBeInTheDocument();
    expect(screen.getByText('Load more')).toBeInTheDocument();
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Relation 1')).toBeInTheDocument();
  });

  describe('Callbacks', () => {
    test('should call onSearchOpen', () => {
      const spy = jest.fn();
      setup({ onSearchOpen: spy });

      fireEvent.mouseDown(screen.getByText(/select\.\.\./i));

      expect(spy).toHaveBeenCalled();
    });

    test('should call onRelationAdd and onSearchClose', () => {
      const onAddSpy = jest.fn();
      const onCloseSpy = jest.fn();
      setup({ onRelationAdd: onAddSpy, onSearchClose: onCloseSpy });

      fireEvent.mouseDown(screen.getByText(/select\.\.\./i));
      expect(screen.getByText('Relation 4')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Relation 4'));

      expect(onAddSpy).toHaveBeenCalled();
      expect(onCloseSpy).toHaveBeenCalled();
    });

    test('should call onRelationRemove', () => {
      const spy = jest.fn();
      setup({ onRelationRemove: spy });

      fireEvent.click(screen.getByTestId('remove-relation-1'));

      expect(spy).toHaveBeenCalled();
    });

    test('should call onRelationLoadMore', () => {
      const spy = jest.fn();
      setup({ onRelationLoadMore: spy });

      fireEvent.click(screen.getByText('Load more'));

      expect(spy).toHaveBeenCalled();
    });

    test('should call onSearch', () => {
      const spy = jest.fn();
      const { container } = setup({ onSearch: spy });

      fireEvent.change(container.querySelector('input'), {
        target: { value: 'searching' },
      });

      expect(spy).toHaveBeenCalled();
    });

    // TO FIX: not able to find the right element to fire scroll event
    // test.only('should call onSearchNextPage', () => {
    //   const spy = jest.fn();
    //   const { container } = setup({ onSearchNextPage: spy });

    //   fireEvent.mouseDown(screen.getByText(/select\.\.\./i));
    //   fireEvent.scroll(screen.getByText('Relation 4'), {
    //     not working with scrollY either
    //     target: { scrollBottom: 100 },
    //   });

    //   expect(spy).toHaveBeenCalled();
    // });
  });

  describe('States', () => {
    test('should display RelationList loading state', () => {
      setup({ relations: { data: { pages: [] }, isLoading: true, isSuccess: true } });

      expect(screen.getByRole('button', { name: /load more/i })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    test('should display search loading state', () => {
      setup({ searchResults: { data: { pages: [] }, isLoading: true, isSuccess: true } });

      fireEvent.mouseDown(screen.getByText(/select\.\.\./i));

      expect(screen.getByText('Relations are loading')).toBeInTheDocument();
    });

    test('should display error state', () => {
      setup({ error: 'This is an error' });

      expect(screen.getByText('This is an error')).toBeInTheDocument();
    });

    test('should apply disabled state', () => {
      setup({ disabled: true });

      expect(screen.queryByText('Load more')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByTestId('remove-relation-1')).toBeDisabled();
    });
  });
});
