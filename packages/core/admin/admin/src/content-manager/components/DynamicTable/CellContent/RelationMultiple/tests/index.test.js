import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';

import { useFetchClient } from '@strapi/helper-plugin';
import RelationMultiple from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
            name: 'Relation entity 1',
          },
          {
            id: 2,
            name: 'Relation entity 2',
          },
          {
            id: 3,
            name: 'Relation entity 3',
          },
        ],

        pagination: {
          total: 1,
        },
      },
    }),
  }),
}));

const DEFAULT_PROPS_FIXTURE = {
  contentType: {
    uid: 'api::address.address',
  },
  entityId: 1,
  fieldSchema: {
    type: 'relation',
    relation: 'manyToMany',
    target: 'api::category.category',
  },
  metadatas: {
    mainField: {
      name: 'name',
      schema: {
        type: 'string',
      },
    },
  },
  value: {
    count: 1,
  },
  name: 'categories.name',
  rowId: 1,
};

const ComponentFixture = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <RelationMultiple {...DEFAULT_PROPS_FIXTURE} />
        </IntlProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('DynamicTable / Cellcontent / RelationMultiple', () => {
  it('renders and matches the snapshot', async () => {
    const { container } = render(<ComponentFixture />);
    expect(container).toMatchSnapshot();
    const { get } = useFetchClient();
    expect(get).toHaveBeenCalledTimes(0);
  });

  it('fetches relation entities once the menu is opened', async () => {
    const { container } = render(<ComponentFixture />);
    const { get } = useFetchClient();
    const button = container.querySelector('[type=button]');

    fireEvent(button, new MouseEvent('mousedown', { bubbles: true }));

    expect(screen.getByText('Relations are loading')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Relation entity 1')).toBeInTheDocument());
  });

  it('Displays related entities in reversed order', async () => {
    const { container } = render(<ComponentFixture />);
    const button = container.querySelector('[type=button]');

    fireEvent(button, new MouseEvent('mousedown', { bubbles: true }));

    await waitFor(() => {
      const buttons = screen.getAllByRole('menuitem');

      expect(buttons[1]).toHaveTextContent('Relation entity 3');
      expect(buttons[2]).toHaveTextContent('Relation entity 2');
      expect(buttons[3]).toHaveTextContent('Relation entity 1');
    });
  });
});
