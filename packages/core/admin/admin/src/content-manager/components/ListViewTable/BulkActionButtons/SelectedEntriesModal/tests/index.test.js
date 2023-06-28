import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { Table } from '@strapi/helper-plugin';
import { render as renderRTL, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import SelectedEntriesModal from '..';

const history = createMemoryHistory();
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

jest.mock('react-redux', () => ({
  useSelector() {
    return {
      data: [
        { id: 1, publishedAt: null },
        { id: 2, publishedAt: '2023-01-01T10:10:10.408Z' },
      ],
      contentType: {
        settings: {
          mainField: 'name',
        },
      },
    };
  },
}));

const user = userEvent.setup();

const render = (ui) => ({
  ...renderRTL(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <Router history={history}>{children}</Router>
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
        <SelectedEntriesModal onConfirm={onConfirm} onToggle={jest.fn()} />
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
        <SelectedEntriesModal onConfirm={jest.fn()} onToggle={jest.fn()} />
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
    const count = screen.getByText('entries selected', { exact: false });
    expect(count).toHaveTextContent('0 entries selected');
    const publishButton = screen.getByRole('button', { name: /publish/i });
    expect(publishButton).toBeDisabled();

    // If at least one item is selected, the publish button should work
    fireEvent.click(checkboxEntry1);
    expect(count).toHaveTextContent('1 entry selected');
    expect(publishButton).not.toBeDisabled();
  });

  it('triggers validation dialog for selected items', async () => {
    const onConfirm = jest.fn();

    render(
      <Table.Root rows={listViewRows} defaultSelectedEntries={[1, 2]} colCount={2}>
        <SelectedEntriesModal onConfirm={onConfirm} onToggle={jest.fn()} />
      </Table.Root>
    );

    const publishButton = screen.getByRole('button', { name: /publish/i });
    await user.click(publishButton);
    expect(onConfirm).toHaveBeenCalledWith([1, 2]);
  });
});
