import React from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';

import { Typography } from '@strapi/design-system/Typography';
import { Tbody, Tr, Td } from '@strapi/design-system/Table';
import { Flex } from '@strapi/design-system/Flex';
import {
  RelativeTime,
  useQueryParams,
  onRowClick,
  pxToRem,
  useTracking,
} from '@strapi/helper-plugin';
import DeleteButton from './DeleteButton';
import UpdateButton from './UpdateButton';
import ReadButton from './ReadButton';

const TableRows = ({ canDelete, canUpdate, canRead, onClickDelete, withBulkActions, rows }) => {
  const [{ query }] = useQueryParams();
  const [, sortOrder] = query.sort.split(':');
  const {
    push,
    location: { pathname },
  } = useHistory();
  const { trackUsage } = useTracking();

  const transferTokens = rows.sort((a, b) => {
    const comparaison = a.name.localeCompare(b.name);

    return sortOrder === 'DESC' ? -comparaison : comparaison;
  });

  return (
    <Tbody>
      {transferTokens.map((transferToken) => {
        return (
          <Tr
            key={transferToken.id}
            {...onRowClick({
              fn() {
                trackUsage('willEditTokenFromList');
                push(`${pathname}/${transferToken.id}`);
              },
              condition: canUpdate,
            })}
          >
            <Td>
              <Typography textColor="neutral800" fontWeight="bold">
                {transferToken.name}
              </Typography>
            </Td>
            <Td maxWidth={pxToRem(250)}>
              <Typography textColor="neutral800" ellipsis>
                {transferToken.description}
              </Typography>
            </Td>
            <Td>
              <Typography textColor="neutral800">
                <RelativeTime timestamp={new Date(transferToken.createdAt)} />
              </Typography>
            </Td>
            <Td>
              {transferToken.lastUsedAt && (
                <Typography textColor="neutral800">
                  <RelativeTime timestamp={new Date(transferToken.lastUsedAt)} />
                </Typography>
              )}
            </Td>

            {withBulkActions && (
              <Td>
                <Flex justifyContent="end">
                  {canUpdate && (
                    <UpdateButton tokenName={transferToken.name} tokenId={transferToken.id} />
                  )}
                  {!canUpdate && canRead && (
                    <ReadButton tokenName={transferToken.name} tokenId={transferToken.id} />
                  )}
                  {canDelete && (
                    <DeleteButton
                      tokenName={transferToken.name}
                      onClickDelete={() => onClickDelete(transferToken.id)}
                    />
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
  canUpdate: false,
  canRead: false,
  onClickDelete() {},
  rows: [],
  withBulkActions: false,
};

TableRows.propTypes = {
  canDelete: PropTypes.bool,
  canUpdate: PropTypes.bool,
  canRead: PropTypes.bool,
  onClickDelete: PropTypes.func,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
};

export default TableRows;
