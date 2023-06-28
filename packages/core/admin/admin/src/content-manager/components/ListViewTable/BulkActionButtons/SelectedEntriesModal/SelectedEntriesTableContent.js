import React from 'react';

import { Typography, Tbody, Tr, Td } from '@strapi/design-system';
import { useTableContext, Table } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { listViewDomain } from '../../../../pages/ListView/selectors';
import { Body } from '../../Body';

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesTableContent
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesTableContent = ({ notifySelectionChange }) => {
  const { selectedEntries, rows } = useTableContext();

  // Get main field from list view layout
  const listViewStore = useSelector(listViewDomain());
  const { mainField } = listViewStore.contentType.settings;
  const shouldDisplayMainField = mainField != null && mainField !== 'id';

  // Notify parent component when selection changes
  React.useEffect(() => {
    notifySelectionChange(selectedEntries);
  }, [selectedEntries, notifySelectionChange]);

  return (
    <Table.Content>
      <Table.Head>
        <Table.HeaderCheckboxCell />
        <Table.HeaderCell fieldSchemaType="number" label="id" name="id" />
        {shouldDisplayMainField && (
          <Table.HeaderCell fieldSchemaType="string" label="name" name="name" />
        )}
      </Table.Head>
      <Tbody>
        {rows.map((entry, index) => (
          <Tr key={entry.id}>
            <Body.CheckboxDataCell rowId={entry.id} index={index} />
            <Td>
              <Typography>{entry.id}</Typography>
            </Td>
            {shouldDisplayMainField && (
              <Td>
                <Typography>{entry[mainField]}</Typography>
              </Td>
            )}
          </Tr>
        ))}
      </Tbody>
    </Table.Content>
  );
};

SelectedEntriesTableContent.propTypes = {
  notifySelectionChange: PropTypes.func.isRequired,
};

export default SelectedEntriesTableContent;
