import React from 'react';
import PropTypes from 'prop-types';
import { Link, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { AxiosError } from 'axios';

import { BaseCheckbox, IconButton, Tbody, Td, Tr, Flex } from '@strapi/design-system';
import { Trash, Duplicate, Pencil } from '@strapi/icons';
import { useTracking, useFetchClient, useAPIErrorHandler } from '@strapi/helper-plugin';

import { usePluginsQueryParams } from '../../../../hooks';

import { getFullName } from '../../../../../utils';

import CellContent from '../CellContent';
import { getTrad } from '../../../../utils';

export const TableRows = ({
  canCreate,
  canDelete,
  contentType,
  headers,
  entriesToDelete,
  onClickDelete,
  onSelectRow,
  withMainAction,
  withBulkActions,
  rows,
}) => {
  const { push, location } = useHistory();
  const { pathname } = location;
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();

  const { trackUsage } = useTracking();
  const pluginsQueryParams = usePluginsQueryParams();
  const { formatAPIError } = useAPIErrorHandler(getTrad);

  /**
   *
   * @param {string} id
   * @returns void
   */
  const handleRowClick = (id) => () => {
    if (!withBulkActions) return;

    trackUsage('willEditEntryFromList');
    push({
      pathname: `${pathname}/${id}`,
      state: { from: pathname },
      search: pluginsQueryParams,
    });
  };

  const handleCloneClick = (id) => async () => {
    try {
      const { data } = await post(
        `/content-manager/collection-types/${contentType.uid}/clone/${id}?${pluginsQueryParams}`
      );

      if ('id' in data) {
        push({
          pathname: `${pathname}/${data.id}`,
          state: { from: pathname },
          search: pluginsQueryParams,
        });
      }
    } catch (err) {
      if (err instanceof AxiosError) {
        push({
          pathname: `${pathname}/create/clone/${id}`,
          state: { from: pathname, error: formatAPIError(err) },
          search: pluginsQueryParams,
        });
      }
    }
  };

  /**
   * Table Cells with actions e.g edit, delete, duplicate have `stopPropagation`
   * to prevent the row from being selected.
   */
  return (
    <Tbody>
      {rows.map((data, index) => {
        const isChecked = entriesToDelete.includes(data.id);
        const itemLineText = formatMessage(
          {
            id: 'content-manager.components.DynamicTable.row-line',
            defaultMessage: 'item line {number}',
          },
          { number: index }
        );

        return (
          <Tr
            cursor={withBulkActions ? 'pointer' : 'default'}
            key={data.id}
            onClick={handleRowClick(data.id)}
          >
            {withMainAction && (
              <Td onClick={(e) => e.stopPropagation()}>
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
                    cellFormatter(data, { key, name, ...rest })
                  ) : (
                    <CellContent
                      content={data[name.split('.')[0]]}
                      name={name}
                      contentType={contentType}
                      {...rest}
                      rowId={data.id}
                    />
                  )}
                </Td>
              );
            })}

            {withBulkActions && (
              <Td>
                <Flex as="span" justifyContent="end" gap={1} onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    forwardedAs={Link}
                    onClick={() => {
                      trackUsage('willEditEntryFromButton');
                    }}
                    to={{
                      pathname: `${pathname}/${data.id}`,
                      state: { from: pathname },
                      search: pluginsQueryParams,
                    }}
                    label={formatMessage(
                      { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                      { target: itemLineText }
                    )}
                    noBorder
                  >
                    <Pencil />
                  </IconButton>

                  {canCreate && (
                    <IconButton
                      onClick={handleCloneClick(data.id)}
                      label={formatMessage(
                        {
                          id: 'app.component.table.duplicate',
                          defaultMessage: 'Duplicate {target}',
                        },
                        { target: itemLineText }
                      )}
                      noBorder
                    >
                      <Duplicate />
                    </IconButton>
                  )}

                  {canDelete && (
                    <IconButton
                      onClick={() => {
                        trackUsage('willDeleteEntryFromList');
                        onClickDelete(data.id);
                      }}
                      label={formatMessage(
                        { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
                        { target: itemLineText }
                      )}
                      noBorder
                    >
                      <Trash />
                    </IconButton>
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
  canCreate: false,
  canDelete: false,
  entriesToDelete: [],
  onClickDelete() {},
  onSelectRow() {},
  rows: [],
  withBulkActions: false,
  withMainAction: false,
};

TableRows.propTypes = {
  canCreate: PropTypes.bool,
  canDelete: PropTypes.bool,
  contentType: PropTypes.shape({
    uid: PropTypes.string.isRequired,
  }).isRequired,
  entriesToDelete: PropTypes.array,
  headers: PropTypes.array.isRequired,
  onClickDelete: PropTypes.func,
  onSelectRow: PropTypes.func,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};
