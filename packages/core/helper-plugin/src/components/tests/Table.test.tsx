import { screen } from '@testing-library/react';
import { render, waitFor, renderHook, act } from '@tests/utils';

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
] as const;

const mockRows = [{ id: 1 }, { id: 2 }];

describe('Table', () => {
  it('should render with content', () => {
    const { getByRole, queryByText } = render(
      <Table.Root rows={[]} colCount={1} isLoading={false} isFetching={false}>
        <Table.Content>
          <tbody>
            <tr>
              <td>content</td>
            </tr>
          </tbody>
        </Table.Content>
      </Table.Root>
    );

    expect(getByRole('cell', { name: 'content' })).toBeInTheDocument();
    expect(queryByText('Loading content')).not.toBeInTheDocument();
  });

  it('should render with loading body', () => {
    const { getByText } = render(
      <Table.Root rows={[]} colCount={1} isLoading={true} isFetching={false}>
        <Table.Content>
          <Table.LoadingBody />
        </Table.Content>
      </Table.Root>
    );

    expect(getByText('Loading content')).toBeInTheDocument();
  });

  it('should render with empty body', () => {
    const { getByText } = render(
      <Table.Root rows={[]} colCount={1} isLoading={false} isFetching={false}>
        <Table.Content>
          <Table.EmptyBody contentType="Test" />
        </Table.Content>
      </Table.Root>
    );

    expect(getByText('No content found')).toBeInTheDocument();
  });

  it('should render headers with checkbox and visually hidden actions', () => {
    const { getByRole, getByText } = render(
      <Table.Root rows={mockRows} colCount={1} isLoading={false} isFetching={false}>
        <Table.Content>
          <Table.Head>
            {/* Bulk action select all checkbox */}
            <Table.HeaderCheckboxCell />
            {mockHeaders.map(({ fieldSchema, key, name, metadatas }) => (
              <Table.HeaderCell
                key={key}
                name={name}
                fieldSchemaType={fieldSchema.type}
                isSortable={metadatas.sortable}
                label={metadatas.label}
              />
            ))}
            {/* Visually hidden header for actions */}
            <Table.HeaderHiddenActionsCell />
          </Table.Head>
        </Table.Content>
      </Table.Root>
    );

    expect(getByRole('button', { name: 'Sort on id' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Select all entries' })).toBeInTheDocument();
    expect(getByText('Actions')).toBeInTheDocument();
  });

  it('should render the bulk action bar with bulk delete button after updating the selectedEntries state', async () => {
    const { result } = renderHook(() => useTableContext(), {
      wrapper: ({ children }) => (
        <Table.Root rows={mockRows} colCount={1} isLoading={false} isFetching={false}>
          <Table.ActionBar>
            <Table.BulkDeleteButton onConfirmDeleteAll={jest.fn()} />
          </Table.ActionBar>
          {children}
        </Table.Root>
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
