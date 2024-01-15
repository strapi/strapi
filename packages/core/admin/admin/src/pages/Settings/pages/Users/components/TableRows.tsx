import {
  BaseCheckbox,
  Box,
  Flex,
  IconButton,
  Tbody,
  Td,
  Tr,
  Typography,
} from '@strapi/design-system';
import { TableRowProps, onRowClick, stopPropagation } from '@strapi/helper-plugin';
import { Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useNavigate } from 'react-router-dom';

import { SanitizedAdminUser } from '../../../../../../../shared/contracts/shared';
import { getFullName } from '../../../../../utils/getFullName';

import type { ListPageTableHeader } from '../ListPage';

interface TableRowsProps extends Partial<TableRowProps<SanitizedAdminUser, ListPageTableHeader>> {
  canDelete: boolean;
}

const TableRows = ({
  canDelete,
  headers = [],
  entriesToDelete = [],
  onClickDelete,
  onSelectRow,
  withMainAction,
  withBulkActions,
  rows = [],
}: TableRowsProps) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  return (
    <Tbody>
      {rows.map((data) => {
        const isChecked = entriesToDelete.findIndex((id) => id === data.id) !== -1;

        return (
          <Tr
            key={data.id}
            {...onRowClick({
              fn: () => navigate(data.id.toString()),
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
                    { target: getFullName(data?.firstname ?? '', data.lastname) }
                  )}
                  checked={isChecked}
                  onChange={() => {
                    if (onSelectRow) {
                      onSelectRow({ name: data.id, value: !isChecked });
                    }
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
                    // @ts-expect-error – name === "roles" has the data value of `AdminRole[]` but the header has a cellFormatter value so this shouldn't be called.
                    <Typography textColor="neutral800">{data[name] || '-'}</Typography>
                  )}
                </Td>
              );
            })}

            {withBulkActions && (
              <Td>
                <Flex justifyContent="end">
                  <IconButton
                    forwardedAs={NavLink}
                    // @ts-expect-error – This is an issue in the DS with the as prop not adding the inferred props to the component.
                    to={data.id.toString()}
                    label={formatMessage(
                      { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                      { target: getFullName(data.firstname ?? '', data.lastname) }
                    )}
                    noBorder
                    icon={<Pencil />}
                  />

                  {canDelete && (
                    <Box paddingLeft={1} {...stopPropagation}>
                      <IconButton
                        onClick={() => {
                          if (onClickDelete) {
                            onClickDelete(data.id);
                          }
                        }}
                        label={formatMessage(
                          { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
                          { target: getFullName(data.firstname ?? '', data.lastname) }
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

export { TableRows };
export type { TableRowsProps };
