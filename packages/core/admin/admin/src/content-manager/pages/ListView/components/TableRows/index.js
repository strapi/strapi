import React from 'react';
import PropTypes from 'prop-types';
import { Link, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { AxiosError } from 'axios';

import { BaseCheckbox, IconButton, Tbody, Td, Tr, Flex } from '@strapi/design-system';
import { Trash, Duplicate, Pencil } from '@strapi/icons';
import { useTracking, useFetchClient } from '@strapi/helper-plugin';

import { usePluginsQueryParams } from '../../../../hooks';

import { getFullName } from '../../../../../utils';

import CellContent from '../CellContent';

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
        `/content-manager/collection-types/${contentType.uid}/clone/${id}`
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
        const serverError = err.response.data;

        push({
          pathname: `${pathname}/create/clone/${id}`,
          state: { from: pathname, error: serverError },
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
          <Row key={data.id} onClick={handleRowClick(data.id)} $isClickable={withBulkActions}>
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
          </Row>
        );
      })}
    </Tbody>
  );
};

const Row = styled(Tr)`
  cursor: ${({ $isClickable }) => ($isClickable ? 'pointer' : 'default')};
`;

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
