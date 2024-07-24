import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import { TableHeader, TableRows } from '../TableRows';

const history = createMemoryHistory();

const headers: TableHeader[] = [
  {
    name: 'action',
    key: 'action',
    metadatas: { label: 'Action', sortable: true },
  },
  {
    key: 'date',
    name: 'date',
    metadatas: { label: 'Date', sortable: true },
  },
  {
    key: 'user',
    name: 'user',
    metadatas: { label: 'User', sortable: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cellFormatter: (value: any) => (value ? value.fullname : null),
  },
];

const rows = [
  {
    id: 1,
    action: 'role.update',
    date: '2022-11-14T23:04:00.000Z',
    payload: {},
    user: {
      id: 1,
      fullname: 'John Doe',
      email: 'test@email.com',
      displayName: 'John Doe',
      isActive: true,
      blocked: false,
      createdAt: '',
      updatedAt: '',
      roles: [],
    },
  },
  {
    id: 2,
    action: 'permission.create',
    date: '2022-11-04T18:24:00.000Z',
    payload: {},
    user: {
      id: 2,
      fullname: 'Kai Doe',
      email: 'test2@email.com',
      displayName: 'Kai Doe',
      isActive: true,
      blocked: false,
      createdAt: '',
      updatedAt: '',
      roles: [],
    },
  },
  {
    id: 3,
    action: 'custom.action',
    date: '2022-11-04T18:23:00.000Z',
    payload: {},
    user: {
      id: 2,
      fullname: 'Kai Doe',
      email: 'test2@email.com',
      displayName: 'Kai Doe',
      isActive: true,
      blocked: false,
      createdAt: '',
      updatedAt: '',
      roles: [],
    },
  },
];

const onModalOpen = jest.fn();

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
      <Router history={history}>
        <table>
          <TableRows headers={headers} rows={rows} onOpenModal={onModalOpen} />
        </table>
      </Router>
    </IntlProvider>
  </ThemeProvider>
);

describe('ADMIN | Pages | AUDIT LOGS | ListView | Dynamic Table | Table Rows', () => {
  it('should show the row data', () => {
    render(App);

    expect(screen.getByText(/update role/i)).toBeInTheDocument();
    expect(screen.getByText(/november 14, 2022, 23:04:00/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();

    expect(screen.getByText(/create permission/i)).toBeInTheDocument();
    expect(screen.getByText(/november 4, 2022, 18:24:00/i)).toBeInTheDocument();
    expect(screen.getAllByText(/kai doe/i).length).toBe(2);

    // For custom actions without translation it should show the action without formatting
    expect(screen.getByText('custom.action')).toBeInTheDocument();
  });

  it('should open a modal when clicked on a view details icon button', () => {
    render(App);
    const label = screen.getByText(/update action details/i);
    // eslint-disable-next-line testing-library/no-node-access
    const viewDetailsButton = label.closest('button');
    if (viewDetailsButton) fireEvent.click(viewDetailsButton);
    expect(onModalOpen).toHaveBeenCalled();
  });

  it('should open a modal when clicked on a row', async () => {
    render(App);
    const rows = await screen.findAllByRole('row');
    fireEvent.click(rows[0]);
    expect(onModalOpen).toHaveBeenCalled();
  });
});
