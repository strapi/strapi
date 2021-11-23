import React from 'react';
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
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import DeleteButton from './DeleteButton';
import UpdateButton from './UpdateButton';

const TableRows = ({ canDelete, canUpdate, onClickDelete, withBulkActions, rows }) => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams();
  const [, sortOrder] = query.sort.split(':');
  const {
    push,
    location: { pathname },
  } = useHistory();
  const { trackUsage } = useTracking();

  const apiTokens = rows.sort((a, b) => {
    const comparaison = a.name.localeCompare(b.name);

    return sortOrder === 'DESC' ? -comparaison : comparaison;
  });

  return (
    <Tbody>
      {apiTokens.map(apiToken => {
        return (
          <Tr
            key={apiToken.id}
            {...onRowClick({
              fn: () => {
                trackUsage('willEditTokenFromList');
                push(`${pathname}/${apiToken.id}`);
              },
              condition: canUpdate,
            })}
          >
            <Td>
              <Typography textColor="neutral800" fontWeight="bold">
                {apiToken.name}
              </Typography>
            </Td>
            <Td maxWidth={pxToRem(250)}>
              <Typography textColor="neutral800" ellipsis>
                {apiToken.description}
              </Typography>
            </Td>
            <Td>
              <Typography textColor="neutral800">
                {formatMessage({
                  id: `Settings.apiTokens.types.${apiToken.type}`,
                  defaultMessage: 'Type unknown',
                })}
              </Typography>
            </Td>
            <Td>
              <Typography textColor="neutral800">
                <RelativeTime timestamp={new Date(apiToken.createdAt)} />
              </Typography>
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
