import * as React from 'react';

import { Box, Flex, IconButton, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import {
  ConfirmDialog,
  DynamicTable,
  onRowClick,
  pxToRem,
  RelativeTime,
  useQueryParams,
  useTracking,
  TableProps as DynamicTableProps,
  TableRowProps,
} from '@strapi/helper-plugin';
import { Eye, Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useHistory } from 'react-router-dom';
import styled from 'styled-components';

import { ApiToken } from '../../../../../../shared/contracts/api-token';
import { SanitizedTransferToken } from '../../../../../../shared/contracts/transfer';

import type { Entity } from '@strapi/types';

interface TokenTableRowData {
  id: Entity.ID;
  name: string;
  description: string;
  createdAt: string;
  lastUsedAt: string;
}

/* -------------------------------------------------------------------------------------------------
 * Table
 * -----------------------------------------------------------------------------------------------*/

interface TableProps
  extends Pick<
    DynamicTableProps<TokenTableRowData>,
    'contentType' | 'onConfirmDelete' | 'headers' | 'isLoading'
  > {
  permissions: {
    canRead: boolean;
    canDelete: boolean;
    canUpdate: boolean;
  };
  tokens: SanitizedTransferToken[] | ApiToken[];
  tokenType: 'api-token' | 'transfer-token';
}

const Table = ({
  permissions,
  headers = [],
  contentType,
  isLoading = false,
  tokens = [],
  onConfirmDelete,
  tokenType,
}: TableProps) => {
  const { canDelete, canUpdate, canRead } = permissions;

  /**
   * TODO: This needs refactoring to the new `Table` component.
   */
  return (
    <DynamicTable
      headers={headers}
      contentType={contentType}
      rows={tokens}
      withBulkActions={canDelete || canUpdate || canRead}
      isLoading={isLoading}
      onConfirmDelete={onConfirmDelete}
    >
      <TableRows
        tokenType={tokenType}
        permissions={permissions}
        onConfirmDelete={onConfirmDelete}
      />
    </DynamicTable>
  );
};

/* -------------------------------------------------------------------------------------------------
 * TableRows
 * -----------------------------------------------------------------------------------------------*/

interface TableRowsProps
  extends Pick<DynamicTableProps<TokenTableRowData>, 'onConfirmDelete'>,
    Pick<TableRowProps<TokenTableRowData>, 'withBulkActions' | 'rows'>,
    Pick<TableProps, 'tokenType'> {
  permissions: {
    canRead: boolean;
    canDelete: boolean;
    canUpdate: boolean;
  };
}

const TableRows = ({
  tokenType,
  permissions,
  rows = [],
  withBulkActions,
  onConfirmDelete,
}: TableRowsProps) => {
  const { canDelete, canUpdate, canRead } = permissions;

  const [{ query }] = useQueryParams<{ sort?: string }>();
  const { formatMessage } = useIntl();
  const [, sortOrder] = query && query.sort ? query.sort.split(':') : [undefined, 'ASC'];
  const {
    push,
    location: { pathname },
  } = useHistory();
  const { trackUsage } = useTracking();

  const sortedTokens = [...rows].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name);

    return sortOrder === 'DESC' ? -comparison : comparison;
  });

  return (
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
                  <RelativeTime
                    timestamp={new Date(token.lastUsedAt)}
                    customIntervals={[
                      {
                        unit: 'hours',
                        threshold: 1,
                        text: formatMessage({
                          id: 'Settings.apiTokens.lastHour',
                          defaultMessage: 'last hour',
                        }),
                      },
                    ]}
                  />
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
                      onClickDelete={() => onConfirmDelete?.(token.id)}
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
  );
};

/* -------------------------------------------------------------------------------------------------
 * CRUD Buttons
 * -----------------------------------------------------------------------------------------------*/

const MESSAGES_MAP = {
  edit: {
    id: 'app.component.table.edit',
    defaultMessage: 'Edit {target}',
  },
  read: {
    id: 'app.component.table.read',
    defaultMessage: 'Read {target}',
  },
};

interface DefaultButtonProps {
  tokenName: string;
  tokenId: Entity.ID;
  buttonType?: 'edit' | 'read';
  children: React.ReactNode;
}

const DefaultButton = ({
  tokenName,
  tokenId,
  buttonType = 'edit',
  children,
}: DefaultButtonProps) => {
  const { formatMessage } = useIntl();
  const {
    location: { pathname },
  } = useHistory();

  return (
    <LinkStyled
      forwardedAs={NavLink}
      to={`${pathname}/${tokenId}`}
      title={formatMessage(MESSAGES_MAP[buttonType], { target: tokenName })}
    >
      {children}
    </LinkStyled>
  );
};

const LinkStyled = styled(Link)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  &:hover,
  &:focus {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.neutral800};
      }
    }
  }
`;

interface DeleteButtonProps extends Pick<ButtonProps, 'tokenName'>, Pick<TableProps, 'tokenType'> {
  onClickDelete: () => void;
}

const DeleteButton = ({ tokenName, onClickDelete, tokenType }: DeleteButtonProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const handleClickDelete = () => {
    setShowConfirmDialog(false);
    trackUsage('willDeleteToken', {
      tokenType,
    });
    onClickDelete();
  };

  return (
    <Box paddingLeft={1} onClick={(e) => e.stopPropagation()}>
      <IconButton
        onClick={() => {
          setShowConfirmDialog(true);
        }}
        label={formatMessage(
          {
            id: 'global.delete-target',
            defaultMessage: 'Delete {target}',
          },
          { target: `${tokenName}` }
        )}
        name="delete"
        borderWidth={0}
        icon={<Trash />}
      />
      <ConfirmDialog
        onToggleDialog={() => setShowConfirmDialog(false)}
        onConfirm={handleClickDelete}
        isOpen={showConfirmDialog}
      />
    </Box>
  );
};

interface ButtonProps {
  tokenName: string;
  tokenId: Entity.ID;
}

const ReadButton = ({ tokenName, tokenId }: ButtonProps) => {
  return (
    <DefaultButton tokenName={tokenName} tokenId={tokenId} buttonType="read">
      <Eye />
    </DefaultButton>
  );
};

const UpdateButton = ({ tokenName, tokenId }: ButtonProps) => {
  return (
    <DefaultButton tokenName={tokenName} tokenId={tokenId}>
      <Pencil width={12} />
    </DefaultButton>
  );
};

export { Table };
export type { TableProps };
