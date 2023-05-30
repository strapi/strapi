import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
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
const setup = (props) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <Table.Provider {...props}>
          <Table.ActionBar>
            <Table.BulkDeleteButton onConfirmDeleteAll={() => jest.fn()} />
          </Table.ActionBar>
          <Table.Content contentType="Test">
            <Table.Head>
              <Table.Headers />
            </Table.Head>
            <tbody>
              <tr>
                <td>content</td>
              </tr>
            </tbody>
          </Table.Content>
        </Table.Provider>
      </IntlProvider>
    </ThemeProvider>
  );
};

describe('Table', () => {
  it('should render with content', () => {
    setup({ rows: mockRows, headers: mockHeaders });
    expect(screen.getByRole('cell', { name: 'content' })).toBeInTheDocument();
  });

  it('should render with content and bulk actions', () => {
    setup({ rows: mockRows, withBulkActions: true });

    expect(screen.getByLabelText(/Select all entries/)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'content' })).toBeInTheDocument();
  });

  it('should render with the correct headers', () => {
    setup({ rows: mockRows, headers: mockHeaders });

    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('short_text')).toBeInTheDocument();
  });

  it('should render an empty state', () => {
    setup({ rows: [] });

    expect(within(screen.getByRole('gridcell')).getByText('No content found')).toBeInTheDocument();
  });

  it('should render with bulk delete action', () => {
    const { result } = renderHook(() => useTableContext(), {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} defaultLocale="en">
            <Table.Provider rows={mockRows} headers={mockHeaders} withBulkActions>
              <Table.ActionBar>
                <Table.BulkDeleteButton onConfirmDeleteAll={() => jest.fn()} />
              </Table.ActionBar>
              {children}
            </Table.Provider>
          </IntlProvider>
        </ThemeProvider>
      ),
    });

    act(() => {
      result.current.setSelectedEntries([1]);
    });

    waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });
});
