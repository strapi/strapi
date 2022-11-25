import React from 'react';
import { Router } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import TableRows from '..';

const history = createMemoryHistory();

const headers = [
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
    metadatas: { label: 'User', sortable: true },
  },
];

const rows = [
  {
    id: 1,
    action: 'Update',
    date: '2022-11-14T23:04:00.000Z',
    user: 'John Doe',
  },
  {
    id: 2,
    action: 'Create',
    date: '2022-11-04T18:24:00.000Z',
    user: 'Kai Doe',
  },
  {
    id: 3,
    action: '',
    date: '2022-11-04T18:23:00.000Z',
    user: 'Kai Doe',
  },
];

const onModalToggle = jest.fn();

// eslint-disable-next-line react/prop-types
const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
      <Router history={history}>
        <TableRows headers={headers} rows={rows} onModalToggle={onModalToggle} />
      </Router>
    </IntlProvider>
  </ThemeProvider>
);

describe('ADMIN | Pages | AUDIT LOGS | ListView | Dynamic Table | Table Rows', () => {
  it('should show the row data', () => {
    render(App);

    expect(screen.getByText(/update action details/i)).toBeInTheDocument();
    expect(screen.getByText(/november 14, 2022, 23:04:00/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();

    expect(screen.getByText(/create action details/i)).toBeInTheDocument();
    expect(screen.getByText(/november 4, 2022, 18:24:00/i)).toBeInTheDocument();
    expect(screen.getAllByText(/kai doe/i).length).toBe(2);

    // empty cell displays '-', here action with id: 3
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should open a modal when clicked on a view details icon button', () => {
    render(App);
    const label = screen.getByText(/update action details/i);
    const viewDetailsButton = label.closest('button');
    fireEvent.click(viewDetailsButton);
    expect(onModalToggle).toHaveBeenCalled();
  });

  it('should open a modal when clicked on a row', () => {
    render(App);
    const rows = document.querySelectorAll('tr');
    fireEvent.click(rows[0]);
    expect(onModalToggle).toHaveBeenCalled();
  });
});
