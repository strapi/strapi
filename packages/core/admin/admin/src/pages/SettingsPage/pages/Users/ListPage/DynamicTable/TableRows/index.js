import React from 'react';
import PropTypes from 'prop-types';
import { BaseCheckbox } from '@strapi/parts/BaseCheckbox';
import { Box } from '@strapi/parts/Box';
import { IconButton } from '@strapi/parts/IconButton';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { Tbody, Td, Tr } from '@strapi/parts/Table';
import EditIcon from '@strapi/icons/EditIcon';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { stopPropagation, onRowClick } from '@strapi/helper-plugin';

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
          <Tr
            key={data.id}
            {...onRowClick({
              fn: () => push(`${pathname}/${data.id}`),
              condition: withBulkActions,
            })}
          >
            {withMainAction && (
              <Td {...stopPropagation}>
                <BaseCheckbox
                  aria-label={formatMessage(
                    {
                      id: 'app.component.table.select.one-entry',
                      defaultMessage: `Select {target}`,
                    },
                    { target: `${data.firstname} ${data.lastname}` }
                  )}
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
                <Row justifyContent="end">
                  <IconButton
                    onClick={() => push(`${pathname}/${data.id}`)}
                    label={formatMessage(
                      { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                      { target: `${data.firstname} ${data.lastname}` }
                    )}
                    noBorder
                    icon={<EditIcon />}
                  />

                  {canDelete && (
                    <Box paddingLeft={1} {...stopPropagation}>
                      <IconButton
                        onClick={() => onClickDelete(data.id)}
                        label={formatMessage(
                          { id: 'app.component.table.delete', defaultMessage: 'Delete {target}' },
                          { target: `${data.firstname} ${data.lastname}` }
                        )}
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
  entriesToDelete: [],
  onClickDelete: () => {},
  onSelectRow: () => {},
  rows: [],
  withBulkActions: false,
  withMainAction: false,
};

TableRows.propTypes = {
  canDelete: PropTypes.bool,
  entriesToDelete: PropTypes.array,
  headers: PropTypes.array.isRequired,
  onClickDelete: PropTypes.func,
  onSelectRow: PropTypes.func,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};

export default TableRows;
