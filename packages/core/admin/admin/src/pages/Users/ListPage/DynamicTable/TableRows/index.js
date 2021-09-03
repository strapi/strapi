import React from 'react';
import PropTypes from 'prop-types';
import { BaseCheckbox, Box, IconButton, Tbody, Td, Text, Tr, Row } from '@strapi/parts';
import { EditIcon, DeleteIcon } from '@strapi/icons';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';

const TableRows = ({
  canDelete,
  headers,
  entriesToDelete,
  onClickDelete,
  onSelectRow,
  withMainAction,
  withBulkActions,
  rows,
}) => {
  const {
    push,
    location: { pathname },
  } = useHistory();
  const { formatMessage } = useIntl();

  return (
    <Tbody>
      {rows.map(data => {
        const isChecked = entriesToDelete.findIndex(id => id === data.id) !== -1;

        return (
          <Tr key={data.id}>
            {withMainAction && (
              <Td>
                <BaseCheckbox
                  aria-label={formatMessage({
                    id: 'list.all-entries.select',
                    defaultMessage: 'Select all entries',
                  })}
                  checked={isChecked}
                  onChange={() => {
                    onSelectRow({ name: data.id, value: !isChecked });
                  }}
                />
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
                  <IconButton
                    onClick={() => push(`${pathname}/${data.id}`)}
                    label={formatMessage({ id: 'app.utils.edit', defaultMessage: 'Edit' })}
                    noBorder
                    icon={<EditIcon />}
                  />

                  {canDelete && (
                    <Box paddingLeft={1}>
                      <IconButton
                        onClick={() => onClickDelete(data.id)}
                        label={formatMessage({ id: 'app.utils.delete', defaultMessage: 'Delete' })}
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
  onClickDelete: () => {},
  onSelectRow: () => {},
  rows: [],
  withBulkActions: false,
  withMainAction: false,
};

TableRows.propTypes = {
  canDelete: PropTypes.bool,
  entriesToDelete: PropTypes.array.isRequired,
  headers: PropTypes.array.isRequired,
  onClickDelete: PropTypes.func,
  onSelectRow: PropTypes.func,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};

export default TableRows;
