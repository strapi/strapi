/* eslint-disable react/prop-types */
import {
  BaseCheckbox,
  Tbody,
  Td,
  ThemeProvider,
  Tr,
  Typography,
  lightTheme,
} from '@strapi/design-system';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { TrackingProvider } from '../../../features/Tracking';
import Table from '../index';

const TableRows = ({
  entriesToDelete,
  onSelectRow,
  rows,
  headers,
  withMainAction,
  allowRangeSelection = true,
}) => {
  return (
    <Tbody>
      {rows.map((data, index) => {
        const isChecked = entriesToDelete.findIndex((id) => id === data.id) !== -1;

        const handleRowSelection = (event) => {
          onSelectRow({
            name: data.id,
            value: !isChecked,
            index: allowRangeSelection ? index : undefined,
            isShiftKeyHeld: allowRangeSelection ? event.nativeEvent.shiftKey : undefined,
          });
        };

        return (
          <Tr key={data.id}>
            {withMainAction && (
              <Td>
                <BaseCheckbox
                  aria-label={`Select ${data.firstname} ${data.lastname}`}
                  className={isChecked ? 'selected' : ''}
                  checked={isChecked}
                  onChange={handleRowSelection}
                />
              </Td>
            )}

            {headers.map(({ key, name }) => {
              return (
                <Td key={key}>
                  <Typography textColor="neutral800">{data[name] || '-'}</Typography>
                </Td>
              );
            })}
          </Tr>
        );
      })}
    </Tbody>
  );
};

const Wrapper = ({ children }) => (
  <MemoryRouter>
    <TrackingProvider value={{ uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7' }}>
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} textComponent="span">
          {children}
        </IntlProvider>
      </ThemeProvider>
    </TrackingProvider>
  </MemoryRouter>
);

const renderTable = (headers, rows, allowRangeSelection = true, withMainAction = true) =>
  render(
    <Table headers={headers} contentType="users" rows={rows} withMainAction={withMainAction}>
      <TableRows headers={headers} rows={rows} allowRangeSelection={allowRangeSelection} />
    </Table>,
    { wrapper: Wrapper }
  );

describe('DynamicTable', () => {
  const headers = [
    {
      name: 'firstname',
      metadatas: { label: 'Firstname', sortable: false },
      key: '__firstname_key__',
    },
    {
      name: 'lastname',
      metadatas: { label: 'Lastname', sortable: false },
      key: '__lastname_key__',
    },
    {
      name: 'email',
      metadatas: { label: 'Email', sortable: false },
      key: '__email_key__',
    },
  ];

  const rows = [
    { id: 1, firstname: 'soup', lastname: 'bowl', email: 'soup@strapi.io' },
    { id: 2, firstname: 'm', lastname: 'frachet', email: 'm@strapi.io' },
    { id: 3, firstname: 'hicham', lastname: 'ELBSI', email: 'helbsi@strapi.io' },
    { id: 4, firstname: 'john', lastname: 'doe', email: 'doe@strapi.io' },
    { id: 5, firstname: 'mary', lastname: 'jane', email: 'jane@strapi.io' },
  ];

  it('renders table content correctly', () => {
    renderTable(headers, rows);
    headers.forEach((header) => {
      expect(screen.getByLabelText(header.metadatas.label)).toBeVisible();
    });

    rows.forEach((row) => {
      expect(screen.getByText(row.firstname)).toBeVisible();
      expect(screen.getByText(row.lastname)).toBeVisible();
      expect(screen.getByText(row.email)).toBeVisible();
    });
  });

  it('Performs single row item selection/deselection', async () => {
    renderTable(headers, rows);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);

    checkboxes.map((box) => expect(box).not.toBeChecked());

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it('Performs range selection/deselection', async () => {
    renderTable(headers, rows);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);

    checkboxes.forEach((box) => expect(box).not.toBeChecked());

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[5], { shiftKey: true });

    checkboxes.slice(1, 6).forEach((box) => expect(box).toBeChecked());

    fireEvent.click(checkboxes[1], { shiftKey: true });
    checkboxes.slice(2, 6).forEach((box) => expect(box).not.toBeChecked());
    expect(checkboxes[1]).toBeChecked();
  });

  it('Perform selection/deselection without range support', async () => {
    renderTable(headers, rows, false);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);

    checkboxes.forEach((box) => expect(box).not.toBeChecked());

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });
});
