import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderRTL, screen, waitFor, renderHook, act } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { Table, useTableContext } from '../Table';

jest.mock('../../hooks/useQueryParams', () => ({
  useQueryParams: jest.fn().mockReturnValue([{}, jest.fn()]),
}));

const mockHeaders = [
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

// eslint-disable-next-line react/prop-types
const Wrapper = ({ children }) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en">
      {children}
    </IntlProvider>
  </ThemeProvider>
);

const render = (props) => ({
  ...renderRTL(<Table.Root {...props} />, {
    wrapper: Wrapper,
  }),
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
    expect(screen.queryByText('Loading content')).not.toBeInTheDocument();
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
            {mockHeaders.map(({ fieldSchema, key, name, metadatas }) => (
              <Table.HeaderCell
                key={key}
                name={name}
                fieldSchemaType={fieldSchema.type}
                relationFieldName={metadatas.mainField?.name}
                isSortable={metadatas.sortable}
                label={metadatas.label}
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

  it('should render the bulk action bar with bulk delete button after updating the selectedEntries state', async () => {
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    expect(screen.getByText('2 entries selected')).toBeInTheDocument();
  });
});
