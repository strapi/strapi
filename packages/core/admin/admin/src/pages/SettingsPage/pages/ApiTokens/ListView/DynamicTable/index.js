import React from 'react';
import { Text } from '@strapi/design-system/Text';
import { Tbody, Tr, Td } from '@strapi/design-system/Table';
import { Flex } from '@strapi/design-system/Flex';
import { RelativeTime, useQueryParams } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import DeleteButton from './DeleteButton';
import UpdateButton from './UpdateButton';

const TableRows = ({ canDelete, canUpdate, onClickDelete, withBulkActions, rows }) => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams();
  const [, sortOrder] = query.sort.split(':');

  const apiTokens = rows.sort((a, b) => {
    const comparaison = a.name.localeCompare(b.name);

    return sortOrder === 'DESC' ? -comparaison : comparaison;
  });

  return (
    <Tbody>
      {apiTokens.map(apiToken => {
        return (
          <Tr key={apiToken.id}>
            <Td key="name">
              <Text textColor="neutral800" bold>
                {apiToken.name}
              </Text>
            </Td>
            <Td key="description">
              <Text textColor="neutral800" ellipsis>
                {apiToken.description}
              </Text>
            </Td>
            <Td key="type">
              <Text textColor="neutral800">
                {formatMessage({
                  id: `Settings.apiTokens.types.${apiToken.type}`,
                  defaultMessage: 'Type unknown',
                })}
              </Text>
            </Td>
            <Td key="createdAt">
              <Text textColor="neutral800">
                <RelativeTime timestamp={new Date(apiToken.createdAt)} />
              </Text>
            </Td>

            {withBulkActions && (
              <Td>
                <Flex justifyContent="end">
                  {canUpdate && <UpdateButton tokenName={apiToken.name} tokenId={apiToken.id} />}
                  {canDelete && (
                    <DeleteButton
                      tokenName={apiToken.name}
                      onClickDelete={() => onClickDelete(apiToken.id)}
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
  onClickDelete: () => {},
  rows: [],
  withBulkActions: false,
};

TableRows.propTypes = {
  canDelete: PropTypes.bool,
  canUpdate: PropTypes.bool,
  onClickDelete: PropTypes.func,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
};

export default TableRows;
