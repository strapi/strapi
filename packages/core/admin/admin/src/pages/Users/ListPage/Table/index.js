import React from 'react';
import PropTypes from 'prop-types';
import {
  BaseCheckbox,
  Box,
  IconButton,
  Table as TableCompo,
  Tbody,
  Td,
  Text,
  Tr,
  Row,
} from '@strapi/parts';
import { EditIcon, DeleteIcon } from '@strapi/icons';
import { EmptyBodyTable, Status } from '@strapi/helper-plugin';
import TableHead from './TableHead';

const Table = ({ canDelete, canUpdate, rows }) => {
  const ROW_COUNT = rows.length + 1;
  const COL_COUNT = 7;

  return (
    <TableCompo colCount={COL_COUNT} rowCount={ROW_COUNT}>
      <TableHead />
      {!rows.length ? (
        <EmptyBodyTable colSpan={COL_COUNT} />
      ) : (
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
                  <Status
                    isActive={entry.isActive}
                    variant={entry.isActive ? 'success' : 'danger'}
                  />
                  <Text textColor="neutral800">{entry.isActive ? 'Active' : 'Inactive'}</Text>
                </Row>
              </Td>
              <Td>
                <Row>
                  {canUpdate && (
                    <IconButton
                      onClick={() => console.log('edit')}
                      label="Edit"
                      noBorder
                      icon={<EditIcon />}
                    />
                  )}
                  {canDelete && (
                    <Box paddingLeft={1}>
                      <IconButton
                        onClick={() => console.log('delete')}
                        label="Delete"
                        noBorder
                        icon={<DeleteIcon />}
                      />
                    </Box>
                  )}
                </Row>
              </Td>
            </Tr>
          ))}
        </Tbody>
      )}
    </TableCompo>
  );
};

Table.defaultProps = {
  rows: [],
};

Table.propTypes = {
  canDelete: PropTypes.bool.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  rows: PropTypes.array,
};

export default Table;
