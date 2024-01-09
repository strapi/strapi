import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

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

const render = () => ({
  ...renderRTL(<RelationMultiple {...DEFAULT_PROPS_FIXTURE} />, {
    wrapper({ children }) {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={lightTheme}>
            <IntlProvider locale="en" messages={{}} defaultLocale="en">
              {children}
            </IntlProvider>
          </ThemeProvider>
        </QueryClientProvider>
      );
    },
  }),
  user: userEvent.setup(),
});

describe('ListViewTable / Cellcontent / RelationMultiple', () => {
  it('renders and renders the menu when clicked', async () => {
    const { getByRole, user } = render();

    expect(getByRole('button', { name: '1 item' })).toBeInTheDocument();

    await user.click(getByRole('button', { name: '1 item' }));

    expect(getByRole('menu')).toBeInTheDocument();

    [1, 2, 3].forEach((number) => {
      expect(getByRole('menuitem', { name: `Relation entity ${number}` })).toBeInTheDocument();
    });
  });

  it('Displays related entities in reversed order', async () => {
    const { user, getByRole, getAllByRole } = render();

    await user.click(getByRole('button', { name: '1 item' }));

    getAllByRole('menuitem').forEach((button, i) => {
      expect(button).toHaveTextContent(`Relation entity ${3 - i}`);
    });
  });
});
