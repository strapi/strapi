import React from 'react';
import PropTypes from 'prop-types';
import {
  BaseCheckbox,
  Box,
  IconButton,
  Table as TableCompo,
  Tbody,
  Td,
  TFooter,
  Text,
  Tr,
  Row,
} from '@strapi/parts';
import { AddIcon, EditIcon, DeleteIcon } from '@strapi/icons';
import { Status } from '@strapi/helper-plugin';
import TableHead from './TableHead';
import TableEmpty from './TableEmpty';

const Table = ({ canCreate, rows }) => {
  if (!rows.length) {
    return <TableEmpty />;
  }

  const ROW_COUNT = rows.length;
  const COL_COUNT = 7;

  return (
    <TableCompo
      colCount={COL_COUNT}
      rowCount={ROW_COUNT}
      footer={
        canCreate ? (
          <TFooter icon={<AddIcon />}>Add another field to this collection type</TFooter>
        ) : (
          undefined
        )
      }
    >
      <TableHead />
      <Tbody>
        {rows.map(entry => (
          <Tr key={entry.id}>
            <Td>
              <BaseCheckbox aria-label={`Select ${entry.email}`} />
            </Td>
            <Td>
              <Text textColor="neutral800">
                {entry.firstname} {entry.lastname}
              </Text>
            </Td>
            <Td>{entry.email}</Td>
            <Td>
              <Text textColor="neutral800">{entry.roles.map(role => role.name).join(',\n')}</Text>
            </Td>
            <Td>
              <Text textColor="neutral800">{entry.username || '-'}</Text>
            </Td>
            <Td>
              <Row>
                <Status isActive={entry.isActive} variant={entry.isActive ? 'success' : 'danger'} />
                <Text textColor="neutral800">{entry.isActive ? 'Active' : 'Inactive'}</Text>
              </Row>
            </Td>
            <Td>
              <Row>
                <IconButton
                  onClick={() => console.log('edit')}
                  label="Edit"
                  noBorder
                  icon={<EditIcon />}
                />
                <Box paddingLeft={1}>
                  <IconButton
                    onClick={() => console.log('delete')}
                    label="Delete"
                    noBorder
                    icon={<DeleteIcon />}
                  />
                </Box>
              </Row>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </TableCompo>
  );
};

Table.defaultProps = {
  rows: [],
};

Table.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  rows: PropTypes.array,
};

export default Table;
