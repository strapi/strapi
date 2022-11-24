import React from 'react';
import { Router } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';
import { fireEvent, render } from '@testing-library/react';
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
    const { getByText } = render(App);

    expect(getByText('Update')).toBeInTheDocument();
    expect(getByText(/november 14, 2022, 23:04:00/i)).toBeInTheDocument();
    expect(getByText(/john doe/i)).toBeInTheDocument();

    expect(getByText('Create')).toBeInTheDocument();
    expect(getByText(/november 4, 2022, 18:24:00/i)).toBeInTheDocument();
    expect(getByText(/kai doe/i)).toBeInTheDocument();
  });

  it('should open a modal when clicked on a view details icon button', () => {
    render(App);
    const svgIcons = document.querySelectorAll('svg');
    const viewDetailsButton = svgIcons[0].closest('button');
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
