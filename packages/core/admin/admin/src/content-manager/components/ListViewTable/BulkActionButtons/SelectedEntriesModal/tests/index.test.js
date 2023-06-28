import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { Table } from '@strapi/helper-plugin';
import { render, screen } from '@testing-library/react';
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

describe('Bulk publish selected entries modal', () => {
  it('renders the selected items in the modal', async () => {
    const onToggle = jest.fn();
    const onConfirm = jest.fn();

    render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <Router history={history}>
            <Table.Root rows={listViewRows} defaultSelectedEntries={[1, 2]} colCount={24}>
              <SelectedEntriesModal onConfirm={onConfirm} onToggle={onToggle} isOpen />
            </Table.Root>
          </Router>
        </IntlProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/publish entries/i)).toBeInTheDocument();

    // Nested table should render the selected items from the parent table
    expect(screen.getByText('Entry 1')).toBeInTheDocument();
    expect(screen.getByText('Entry 3')).not.toBeInTheDocument();

    // User can toggle selected entries in the modal
    const checkboxEntry1 = screen.getByRole('checkbox', { name: 'Select 1' });
    const checkboxEntry2 = screen.getByRole('checkbox', { name: 'Select 2' });

    // All table items should be selected by default
    expect(checkboxEntry1).toBeChecked();
    expect(checkboxEntry2).toBeChecked();

    // User can unselect items
    await user.click(checkboxEntry1);
    expect(checkboxEntry1).not.toBeChecked();
    await user.click(checkboxEntry2);
    expect(checkboxEntry2).not.toBeChecked();
  });
});
