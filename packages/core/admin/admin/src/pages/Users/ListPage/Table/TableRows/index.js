import React from 'react';
import PropTypes from 'prop-types';
import { BaseCheckbox, Box, IconButton, Tbody, Td, Text, Tr, Row } from '@strapi/parts';
import { EditIcon, DeleteIcon } from '@strapi/icons';
import { useHistory } from 'react-router-dom';

const TableRows = ({ canUpdate, canDelete, headers, withMainAction, withBulkActions, rows }) => {
  const {
    push,
    location: { pathname },
  } = useHistory();

  return (
    <Tbody>
      {rows.map(data => {
        return (
          <Tr key={data.id}>
            {withMainAction && (
              <Td>
                <BaseCheckbox aria-label="Select all entries" />
              </Td>
            )}
            {headers.map(({ key, cellFormatter, name, ...rest }) => {
              return (
                <Td key={key}>
                  {typeof cellFormatter === 'function' ? (
                    cellFormatter(data, { key, name, ...rest })
                  ) : (
                    <Text textColor="neutral800">{data[name] || '-'}</Text>
                  )}
                </Td>
              );
            })}

            {withBulkActions && (
              <Td>
                <Row>
                  {canUpdate && (
                    <IconButton
                      onClick={() => push(`${pathname}/${data.id}`)}
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
            )}
          </Tr>
        );
      })}
    </Tbody>
  );
};

TableRows.defaultProps = {
  canDelete: false,
  canUpdate: false,
  rows: [],
  withBulkActions: false,
  withMainAction: false,
};

TableRows.propTypes = {
  canDelete: PropTypes.bool,
  canUpdate: PropTypes.bool,
  headers: PropTypes.array.isRequired,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};

export default TableRows;
