import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react-hooks';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { Table, useTableContext } from '../index';

jest.mock('../../../hooks/useQueryParams', () => jest.fn().mockReturnValue([{}, jest.fn()]));
jest.mock('../../../features/Tracking', () => ({
  useTracking: jest.fn(() => ({
    trackUsage: jest.fn(),
  })),
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

const BaseTestComponent = (props) => {
  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        {/* eslint-disable-next-line react/prop-types */}
        <Table.Root {...props}>{props.children}</Table.Root>
      </IntlProvider>
    </ThemeProvider>
  );
};

describe('Table', () => {
  it('should render with content', () => {
    render(
      <BaseTestComponent>
        <Table.Content contentType="Test">
          <tbody>
            <tr>
              <td>content</td>
            </tr>
          </tbody>
        </Table.Content>
      </BaseTestComponent>
    );

    expect(screen.getByRole('cell', { name: 'content' })).toBeInTheDocument();
    expect(screen.queryByText('Loading content')).toBeNull();
  });

  it('should renders with loading body', () => {
    render(
      <BaseTestComponent isLoading>
        <Table.Content>
          <Table.LoadingBody />
        </Table.Content>
      </BaseTestComponent>
    );

    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  it('should render with empty body', () => {
    render(
      <BaseTestComponent rows={[]} colCount={1}>
        <Table.Content>
          <Table.EmptyBody contentType="Test" />
        </Table.Content>
      </BaseTestComponent>
    );

    expect(screen.getByText('No content found')).toBeInTheDocument();
  });

  it('should render headers with checkbox and visually hidden actions', () => {
    render(
      <BaseTestComponent rows={mockRows} colCount={1}>
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
      </BaseTestComponent>
    );

    expect(screen.getByRole('button', { name: 'Sort on id' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select all entries' })).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should render the bulk action bar with bulk delete button after updating the selectedEntries state', () => {
    const { result } = renderHook(() => useTableContext(), {
      wrapper: ({ children }) => (
        <BaseTestComponent rows={mockRows} colCount={1}>
          <Table.ActionBar>
            <Table.BulkDeleteButton onConfirmDeleteAll={() => jest.fn()} />
          </Table.ActionBar>
          {children}
        </BaseTestComponent>
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
