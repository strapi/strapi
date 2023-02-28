import React from 'react';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Typography, Flex, Tbody, Tr, Td } from '@strapi/design-system';
import {
  RelativeTime,
  onRowClick,
  pxToRem,
  DynamicTable,
  useQueryParams,
  useTracking,
} from '@strapi/helper-plugin';
import DeleteButton from './DeleteButton';
import UpdateButton from './UpdateButton';
import ReadButton from './ReadButton';

const Table = ({
  permissions,
  headers,
  contentType,
  isLoading,
  tokens,
  onConfirmDelete,
  tokenType,
}) => {
  const { canDelete, canUpdate, canRead } = permissions;
  const withBulkActions = canDelete || canUpdate || canRead;
  const [{ query }] = useQueryParams();
  const [, sortOrder] = query ? query.sort.split(':') : 'ASC';
  const {
    push,
    location: { pathname },
  } = useHistory();
  const { trackUsage } = useTracking();

  const sortedTokens = tokens.sort((a, b) => {
    const comparison = a.name.localeCompare(b.name);

    return sortOrder === 'DESC' ? -comparison : comparison;
  });

  return (
    <DynamicTable
      headers={headers}
      contentType={contentType}
      rows={tokens}
      withBulkActions={withBulkActions}
      isLoading={isLoading}
      onConfirmDelete={onConfirmDelete}
    >
      <Tbody>
        {sortedTokens.map((token) => {
          return (
            <Tr
              key={token.id}
              {...onRowClick({
                fn() {
                  trackUsage('willEditTokenFromList', {
                    tokenType,
                  });
                  push(`${pathname}/${token.id}`);
                },
                condition: canUpdate,
              })}
            >
              <Td maxWidth={pxToRem(250)}>
                <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                  {token.name}
                </Typography>
              </Td>
              <Td maxWidth={pxToRem(250)}>
                <Typography textColor="neutral800" ellipsis>
                  {token.description}
                </Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">
                  <RelativeTime timestamp={new Date(token.createdAt)} />
                </Typography>
              </Td>
              <Td>
                {token.lastUsedAt && (
                  <Typography textColor="neutral800">
                    <RelativeTime timestamp={new Date(token.lastUsedAt)} />
                  </Typography>
                )}
              </Td>

              {withBulkActions && (
                <Td>
                  <Flex justifyContent="end">
                    {canUpdate && <UpdateButton tokenName={token.name} tokenId={token.id} />}
                    {!canUpdate && canRead && (
                      <ReadButton tokenName={token.name} tokenId={token.id} />
                    )}
                    {canDelete && (
                      <DeleteButton
                        tokenName={token.name}
                        onClickDelete={() => onConfirmDelete(token.id)}
                        tokenType={tokenType}
                      />
                    )}
                  </Flex>
                </Td>
              )}
            </Tr>
          );
        })}
      </Tbody>
    </DynamicTable>
  );
};

Table.propTypes = {
  tokens: PropTypes.array,
  permissions: PropTypes.shape({
    canRead: PropTypes.bool,
    canDelete: PropTypes.bool,
    canUpdate: PropTypes.bool,
  }).isRequired,
  headers: PropTypes.arrayOf(
    PropTypes.shape({
      cellFormatter: PropTypes.func,
      key: PropTypes.string.isRequired,
      metadatas: PropTypes.shape({
        label: PropTypes.string.isRequired,
        sortable: PropTypes.bool,
      }).isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  contentType: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
  onConfirmDelete: PropTypes.func,
  tokenType: PropTypes.string.isRequired,
};

Table.defaultProps = {
  tokens: [],
  headers: [],
  isLoading: false,
  onConfirmDelete() {},
};

export default Table;
