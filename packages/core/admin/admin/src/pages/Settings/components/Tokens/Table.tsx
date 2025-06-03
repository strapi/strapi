import * as React from 'react';

import {
  Box,
  Flex,
  IconButton,
  Typography,
  useCollator,
  Dialog,
  LinkButton,
} from '@strapi/design-system';
import { Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { ApiToken } from '../../../../../../shared/contracts/api-token';
import { SanitizedTransferToken } from '../../../../../../shared/contracts/transfer';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { RelativeTime } from '../../../../components/RelativeTime';
import { Table as TableImpl } from '../../../../components/Table';
import { useTracking } from '../../../../features/Tracking';
import { useQueryParams } from '../../../../hooks/useQueryParams';

import type { Data } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * Table
 * -----------------------------------------------------------------------------------------------*/

interface TableProps
  extends Pick<TableImpl.Props<SanitizedTransferToken | ApiToken>, 'headers' | 'isLoading'> {
  onConfirmDelete: (id: Data.ID) => void;
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
  isLoading = false,
  tokens = [],
  onConfirmDelete,
  tokenType,
}: TableProps) => {
  const [{ query }] = useQueryParams<{ sort?: string }>();
  const { formatMessage, locale } = useIntl();
  const [, sortOrder] = query && query.sort ? query.sort.split(':') : [undefined, 'ASC'];
  const navigate = useNavigate();
  const { trackUsage } = useTracking();
  const formatter = useCollator(locale);

  const sortedTokens = [...tokens].sort((a, b) => {
    return sortOrder === 'DESC'
      ? formatter.compare(b.name, a.name)
      : formatter.compare(a.name, b.name);
  });

  const { canDelete, canUpdate, canRead } = permissions;

  const handleRowClick = (id: Data.ID) => () => {
    if (canRead) {
      trackUsage('willEditTokenFromList', {
        tokenType,
      });
      navigate(id.toString());
    }
  };

  return (
    <TableImpl.Root headers={headers} rows={sortedTokens} isLoading={isLoading}>
      <TableImpl.Content>
        <TableImpl.Head>
          {headers.map((header) => (
            <TableImpl.HeaderCell key={header.name} {...header} />
          ))}
        </TableImpl.Head>
        <TableImpl.Empty />
        <TableImpl.Loading />
        <TableImpl.Body>
          {sortedTokens.map((token) => (
            <TableImpl.Row key={token.id} onClick={handleRowClick(token.id)}>
              <TableImpl.Cell maxWidth="25rem">
                <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                  {token.name}
                </Typography>
              </TableImpl.Cell>
              <TableImpl.Cell maxWidth="25rem">
                <Typography textColor="neutral800" ellipsis>
                  {token.description}
                </Typography>
              </TableImpl.Cell>
              <TableImpl.Cell>
                <Typography textColor="neutral800">
                  {/* @ts-expect-error One of the tokens doesn't have createdAt */}
                  <RelativeTime timestamp={new Date(token.createdAt)} />
                </Typography>
              </TableImpl.Cell>
              <TableImpl.Cell>
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
              </TableImpl.Cell>
              {canUpdate || canRead || canDelete ? (
                <TableImpl.Cell>
                  <Flex justifyContent="end">
                    {canUpdate && <UpdateButton tokenName={token.name} tokenId={token.id} />}
                    {canDelete && (
                      <DeleteButton
                        tokenName={token.name}
                        onClickDelete={() => onConfirmDelete?.(token.id)}
                        tokenType={tokenType}
                      />
                    )}
                  </Flex>
                </TableImpl.Cell>
              ) : null}
            </TableImpl.Row>
          ))}
        </TableImpl.Body>
      </TableImpl.Content>
    </TableImpl.Root>
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
  tokenId: Data.ID;
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

  return (
    <LinkButtonStyled
      tag={NavLink}
      to={tokenId.toString()}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      title={formatMessage(MESSAGES_MAP[buttonType], { target: tokenName })}
      variant="ghost"
      size="S"
    >
      {children}
    </LinkButtonStyled>
  );
};

const LinkButtonStyled = styled(LinkButton)`
  padding: 0.7rem;

  & > span {
    display: flex;
  }
`;

interface DeleteButtonProps extends Pick<ButtonProps, 'tokenName'>, Pick<TableProps, 'tokenType'> {
  onClickDelete: () => void;
}

const DeleteButton = ({ tokenName, onClickDelete, tokenType }: DeleteButtonProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const handleClickDelete = () => {
    trackUsage('willDeleteToken', {
      tokenType,
    });
    onClickDelete();
  };

  return (
    <Dialog.Root>
      <Box<'div'> paddingLeft={1} onClick={(e) => e.stopPropagation()}>
        <Dialog.Trigger>
          <IconButton
            label={formatMessage(
              {
                id: 'global.delete-target',
                defaultMessage: 'Delete {target}',
              },
              { target: `${tokenName}` }
            )}
            name="delete"
            variant="ghost"
          >
            <Trash />
          </IconButton>
        </Dialog.Trigger>
        <ConfirmDialog onConfirm={handleClickDelete} />
      </Box>
    </Dialog.Root>
  );
};

interface ButtonProps {
  tokenName: string;
  tokenId: Data.ID;
}

const UpdateButton = ({ tokenName, tokenId }: ButtonProps) => {
  return (
    <DefaultButton tokenName={tokenName} tokenId={tokenId}>
      <Pencil />
    </DefaultButton>
  );
};

export { Table };
export type { TableProps };
