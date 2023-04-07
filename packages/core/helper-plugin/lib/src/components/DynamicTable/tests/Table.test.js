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
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import * as React from 'react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import TrackingProvider from '../../../providers/TrackingProvider';
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

const renderTable = (headers, rows, allowRangeSelection = true, withMainAction = true) =>
  render(
    <MemoryRouter>
      <TrackingProvider value={{ uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7' }}>
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} textComponent="span">
            <Table
              headers={headers}
              contentType="users"
              rows={rows}
              withMainAction={withMainAction}
            >
              <TableRows headers={headers} rows={rows} allowRangeSelection={allowRangeSelection} />
            </Table>
          </IntlProvider>
        </ThemeProvider>
      </TrackingProvider>
    </MemoryRouter>
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
    { id: 1, firstname: 'soup', lastname: 'soup', email: 'soup@strapi.io' },
    { id: 2, firstname: 'm', lastname: 'frachet', email: 'm@strapi.io' },
    { id: 3, firstname: 'hicham', lastname: 'ELBSI', email: 'helbsi@strapi.io' },
    { id: 4, firstname: 'john', lastname: 'doe', email: 'doe@strapi.io' },
    { id: 5, firstname: 'mary', lastname: 'jane', email: 'jane@strapi.io' },
  ];

  it('Performs single row item selection/deselection', async () => {
    const { container } = renderTable(headers, rows);

    expect(container).toMatchSnapshot();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);

    checkboxes.map((box) => expect(box).not.toHaveClass('selected'));

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    await waitFor(() => {
      expect(checkboxes[1]).toHaveClass('selected');
      expect(checkboxes[2]).toHaveClass('selected');
    });

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    await waitFor(() => {
      expect(checkboxes[1]).not.toHaveClass('selected');
      expect(checkboxes[2]).not.toHaveClass('selected');
    });
  });

  it('Performs range selection/deselection', async () => {
    renderTable(headers, rows);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);

    checkboxes.forEach((box) => expect(box).not.toHaveClass('selected'));

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[5], { shiftKey: true });

    await waitFor(() => {
      checkboxes.slice(1, 6).forEach((box) => expect(box).toHaveClass('selected'));
    });

    fireEvent.click(checkboxes[1], { shiftKey: true });
    await waitFor(() => {
      checkboxes.slice(2, 6).forEach((box) => expect(box).not.toHaveClass('selected'));
      expect(checkboxes[1]).toHaveClass('selected');
    });
  });

  it('Perform selection/deselection without range support', async () => {
    renderTable(headers, rows, false);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);

    checkboxes.forEach((box) => expect(box).not.toHaveClass('selected'));

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    await waitFor(() => {
      expect(checkboxes[1]).toHaveClass('selected');
      expect(checkboxes[2]).toHaveClass('selected');
    });

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    await waitFor(() => {
      expect(checkboxes[1]).not.toHaveClass('selected');
      expect(checkboxes[2]).not.toHaveClass('selected');
    });
  });
});
