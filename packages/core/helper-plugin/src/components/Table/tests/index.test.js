import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderRTL, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import { Table, useTableContext } from '../index';

jest.mock('../../../features/Tracking', () => ({
  useTracking: jest.fn(() => ({
    trackUsage: jest.fn(),
  })),
}));

const HEADERS_MOCK = [
  {
    key: '__id_key__',
    name: 'id',
    fieldSchema: {
      type: 'integer',
    },
    metadatas: {
      label: 'id',
      searchable: true,
      sortable: true,
    },
  },
  {
    key: '__short_text_key__',
    name: 'short_text',
    fieldSchema: {
      type: 'string',
    },
    metadatas: {
      label: 'short_text',
      searchable: true,
      sortable: true,
    },
  },
];

const mockRows = [{ id: 1 }, { id: 2 }];

const history = createMemoryHistory();

// eslint-disable-next-line react/prop-types
const Wrapper = ({ children }) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en">
      <Router history={history}>{children}</Router>
    </IntlProvider>
  </ThemeProvider>
);

const render = (props) => ({
  ...renderRTL(<Table.Root {...props} />, {
    wrapper: Wrapper,
  }),
  user: userEvent.setup(),
});

describe('Table', () => {
  it('should render with content', () => {
    render({
      children: (
        <Table.Content contentType="Test">
          <tbody>
            <tr>
              <td>content</td>
            </tr>
          </tbody>
        </Table.Content>
      ),
    });

    expect(screen.getByRole('cell', { name: 'content' })).toBeInTheDocument();
    expect(screen.queryByText('Loading content')).toBeNull();
  });

  it('should render with loading body', () => {
    render({
      isLoading: true,
      children: (
        <Table.Content>
          <Table.LoadingBody />
        </Table.Content>
      ),
    });

    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  it('should render with empty body', () => {
    render({
      rows: [],
      colCount: 1,
      children: (
        <Table.Content>
          <Table.EmptyBody contentType="Test" />
        </Table.Content>
      ),
    });

    expect(screen.getByText('No content found')).toBeInTheDocument();
  });

  it('should render headers with checkbox and visually hidden actions', () => {
    render({
      rows: mockRows,
      colCount: 1,
      children: (
        <Table.Content>
          <Table.Head>
            {/* Bulk action select all checkbox */}
            <Table.HeaderCheckboxCell />
            {HEADERS_MOCK.map(({ fieldSchema, key, name, metadatas }) => (
              <Table.HeaderCell
                key={key}
                name={name}
                fieldSchemaType={fieldSchema.type}
                metadatas={metadatas}
              />
            ))}
            {/* Visually hidden header for actions */}
            <Table.HeaderHiddenActionsCell />
          </Table.Head>
        </Table.Content>
      ),
    });

    expect(screen.getByRole('button', { name: 'Sort on id' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select all entries' })).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should sort relational headers using sortPriority', async () => {
    const { user, getByRole } = render({
      rows: mockRows,
      colCount: 1,
      children: (
        <Table.Content>
          <Table.Head>
            <Table.HeaderCheckboxCell />
            {[
              ...HEADERS_MOCK,
              {
                key: `__rel_temp_key__`,
                name: 'relation',
                fieldSchema: {
                  type: 'relation',
                },
                metadatas: {
                  label: 'relation',
                  searchable: false,
                  sortable: true,
                  mainField: [
                    {
                      name: 'prop1',
                      schema: {
                        type: 'string',
                      },
                    },

                    {
                      name: 'prop2',
                      schema: {
                        type: 'string',
                      },
                    },

                    {
                      name: 'prop3',
                      schema: {
                        type: 'string',
                      },
                    },
                  ],
                },
              },
            ].map(({ fieldSchema, key, name, metadatas }) => (
              <Table.HeaderCell
                key={key}
                name={name}
                fieldSchemaType={fieldSchema.type}
                metadatas={metadatas}
              />
            ))}
          </Table.Head>
        </Table.Content>
      ),
    });

    const sortButton = getByRole('button', { name: 'Sort on relation' });
    expect(sortButton).toBeInTheDocument();

    await user.click(sortButton);

    expect(history.location.search).toBe(
      '?sort=relation[prop1]:ASC&sort=relation[prop2]:ASC&sort=relation[prop3]:ASC'
    );
  });

  it('should render the bulk action bar with bulk delete button after updating the selectedEntries state', () => {
    const { result } = renderHook(() => useTableContext(), {
      wrapper: ({ children }) => (
        <Wrapper>
          <Table.Root row={mockRows} colCount={1}>
            <Table.ActionBar>
              <Table.BulkDeleteButton onConfirmDeleteAll={() => jest.fn()} />
            </Table.ActionBar>
            {children}
          </Table.Root>
        </Wrapper>
      ),
    });

    act(() => {
      result.current.setSelectedEntries([1, 2]);
    });

    waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByText('2 entries selected')).toBeInTheDocument();
    });
  });
});
