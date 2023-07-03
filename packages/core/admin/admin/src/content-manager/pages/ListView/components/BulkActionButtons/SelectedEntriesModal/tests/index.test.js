import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { Table } from '@strapi/helper-plugin';
import { render as renderRTL, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { combineReducers, createStore } from 'redux';

import SelectedEntriesModal from '..';
import reducers from '../../../../../../../reducers';

const listViewRows = [
  {
    id: 1,
    name: 'Entry 1',
  },
  {
    id: 2,
    name: 'Entry 2',
  },
  {
    id: 3,
    name: 'Entry 3',
  },
];

const user = userEvent.setup();

const rootReducer = combineReducers(reducers);
const store = createStore(rootReducer, {
  'content-manager_listView': {
    contentType: {
      settings: {
        mainField: 'name',
      },
      attributes: {
        id: { type: 'integer' },
        name: { type: 'string', required: true },
      },
    },
  },
});

const render = (ui) => ({
  ...renderRTL(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <Provider store={store}>
            <MemoryRouter>{children}</MemoryRouter>
          </Provider>
        </IntlProvider>
      </ThemeProvider>
    ),
  }),
});

describe('Bulk publish selected entries modal', () => {
  it('renders the selected items in the modal', async () => {
    const onConfirm = jest.fn();

    render(
      <Table.Root rows={listViewRows} defaultSelectedEntries={[1, 2]} colCount={2}>
        <SelectedEntriesModal
          onConfirm={onConfirm}
          onToggle={jest.fn()}
          onRefreshData={jest.fn()}
          isRefreshing={false}
        />
      </Table.Root>
    );

    expect(screen.getByText(/publish entries/i)).toBeInTheDocument();

    // Nested table should render the selected items from the parent table
    expect(screen.getByText('Entry 1')).toBeInTheDocument();
    expect(screen.queryByText('Entry 3')).not.toBeInTheDocument();
  });

  it('reacts to selection updates', async () => {
    render(
      <Table.Root rows={listViewRows} defaultSelectedEntries={[1, 2]} colCount={2}>
        <SelectedEntriesModal
          onConfirm={jest.fn()}
          onToggle={jest.fn()}
          onRefreshData={jest.fn()}
          isRefreshing={false}
        />
      </Table.Root>
    );

    // User can toggle selected entries in the modal
    const checkboxEntry1 = screen.getByRole('checkbox', { name: 'Select 1' });
    const checkboxEntry2 = screen.getByRole('checkbox', { name: 'Select 2' });

    // All table items should be selected by default
    expect(checkboxEntry1).toBeChecked();
    expect(checkboxEntry2).toBeChecked();

    // User can unselect items
    fireEvent.click(checkboxEntry1);
    expect(checkboxEntry1).not.toBeChecked();
    fireEvent.click(checkboxEntry2);
    expect(checkboxEntry2).not.toBeChecked();

    // Publish button should be disabled if no items are selected
    const count = screen.getByText('entries ready to publish', { exact: false });
    expect(count).toHaveTextContent('0 entries ready to publish');
    const publishButton = screen.getByRole('button', { name: /publish/i });
    expect(publishButton).toBeDisabled();

    // If at least one item is selected, the publish button should work
    fireEvent.click(checkboxEntry1);
    expect(count).toHaveTextContent('1 entry ready to publish');
    expect(publishButton).not.toBeDisabled();
  });

  it('triggers validation dialog for selected items', async () => {
    const onConfirm = jest.fn();

    render(
      <Table.Root rows={listViewRows} defaultSelectedEntries={[1, 2]} colCount={2}>
        <SelectedEntriesModal
          onConfirm={onConfirm}
          onToggle={jest.fn()}
          onRefreshData={jest.fn()}
          isRefreshing={false}
        />
      </Table.Root>
    );

    const publishButton = screen.getByRole('button', { name: /publish/i });
    await user.click(publishButton);
    expect(onConfirm).toHaveBeenCalledWith([1, 2]);
  });

  it('should show validation errors if there is an error', async () => {
    const listViewRowsWithError = [
      {
        id: 1,
        name: 'Entry 1',
      },
      {
        id: 2,
        name: '',
      },
    ];

    render(
      <Table.Root rows={listViewRowsWithError} defaultSelectedEntries={[1, 2]} colCount={2}>
        <SelectedEntriesModal
          onConfirm={jest.fn()}
          onToggle={jest.fn()}
          onRefreshData={jest.fn()}
          isRefreshing={false}
        />
      </Table.Root>
    );

    // Is showing the error message
    expect(screen.getByText('components.Input.error.validation.required')).toBeInTheDocument();

    // Publish button is enabled if at least one selected entry is valid
    const publishButton = screen.getByRole('button', { name: /publish/i });
    expect(publishButton).not.toBeDisabled();

    // Publish button is disabled if all selected entries have errors
    const checkboxEntry1 = screen.getByRole('checkbox', { name: 'Select 1' });
    fireEvent.click(checkboxEntry1);
    expect(publishButton).toBeDisabled();
  });
});
