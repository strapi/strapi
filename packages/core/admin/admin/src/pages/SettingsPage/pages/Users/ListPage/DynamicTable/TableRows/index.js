import React from 'react';
import PropTypes from 'prop-types';
import {
  BaseCheckbox,
  Box,
  IconButton,
  Flex,
  Typography,
  Tbody,
  Td,
  Tr,
} from '@strapi/design-system';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { stopPropagation, onRowClick } from '@strapi/helper-plugin';
import { getFullName } from '../../../../../../../utils';

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
      {rows.map((data) => {
        const isChecked = entriesToDelete.findIndex((id) => id === data.id) !== -1;

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
                    { target: getFullName(data.firstname, data.lastname) }
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
                    cellFormatter(data, { key, name, formatMessage, ...rest })
                  ) : (
                    <Typography textColor="neutral800">{data[name] || '-'}</Typography>
                  )}
                </Td>
              );
            })}

            {withBulkActions && (
              <Td>
                <Flex justifyContent="end">
                  <IconButton
                    onClick={() => push(`${pathname}/${data.id}`)}
                    label={formatMessage(
                      { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                      { target: getFullName(data.firstname, data.lastname) }
                    )}
                    noBorder
                    icon={<Pencil />}
                  />

                  {canDelete && (
                    <Box paddingLeft={1} {...stopPropagation}>
                      <IconButton
                        onClick={() => onClickDelete(data.id)}
                        label={formatMessage(
                          { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
                          { target: getFullName(data.firstname, data.lastname) }
                        )}
                        noBorder
                        icon={<Trash />}
                      />
                    </Box>
                  )}
                </Flex>
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
  onClickDelete() {},
  onSelectRow() {},
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
