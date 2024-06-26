import * as React from 'react';

import { Flex, IconButton, Typography, Icon } from '@strapi/design-system';
import { Menu, Link } from '@strapi/design-system/v2';
import { CheckPermissions, useAPIErrorHandler, useNotification } from '@strapi/helper-plugin';
import { Cross, More, Pencil } from '@strapi/icons';
import { isAxiosError } from 'axios';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

import { DeleteReleaseAction, ReleaseAction } from '../../../shared/contracts/release-actions';
import { Release } from '../../../shared/contracts/releases';
import { PERMISSIONS } from '../constants';
import { useDeleteReleaseActionMutation } from '../services/release';
import { useTypedSelector } from '../store/hooks';

import type { Permission } from '@strapi/helper-plugin';

const StyledMenuItem = styled(Menu.Item)<{ variant?: 'neutral' | 'danger' }>`
  &:hover {
    background: ${({ theme, variant = 'neutral' }) => theme.colors[`${variant}100`]};

    svg {
      path {
        fill: ${({ theme, variant = 'neutral' }) => theme.colors[`${variant}600`]};
      }
    }

    a {
      color: ${({ theme }) => theme.colors.neutral800};
    }
  }

  svg {
    path {
      fill: ${({ theme, variant = 'neutral' }) => theme.colors[`${variant}600`]};
    }
  }

  a {
    color: ${({ theme }) => theme.colors.neutral800};
  }

  span,
  a {
    width: 100%;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * DeleteReleaseActionItemProps
 * -----------------------------------------------------------------------------------------------*/
const StyledIconButton = styled(IconButton)`
  /* Setting this style inline with borderColor will not apply the style */
  border: ${({ theme }) => `1px solid ${theme.colors.neutral200}`};
`;
interface DeleteReleaseActionItemProps {
  releaseId: DeleteReleaseAction.Request['params']['releaseId'];
  actionId: DeleteReleaseAction.Request['params']['actionId'];
}

const DeleteReleaseActionItem = ({ releaseId, actionId }: DeleteReleaseActionItemProps) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const [deleteReleaseAction] = useDeleteReleaseActionMutation();

  const handleDeleteAction = async () => {
    const response = await deleteReleaseAction({
      params: { releaseId, actionId },
    });

    if ('data' in response) {
      // Handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.content-manager-edit-view.remove-from-release.notification.success',
          defaultMessage: 'Entry removed from release',
        }),
      });

      return;
    }

    if ('error' in response) {
      if (isAxiosError(response.error)) {
        // Handle axios error
        toggleNotification({
          type: 'warning',
          message: formatAPIError(response.error),
        });
      } else {
        // Handle generic error
        toggleNotification({
          type: 'warning',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
        });
      }
    }
  };

  return (
    <CheckPermissions permissions={PERMISSIONS.deleteAction}>
      <StyledMenuItem variant="danger" onSelect={handleDeleteAction}>
        <Flex gap={2}>
          <Icon as={Cross} width={3} height={3} />
          <Typography textColor="danger600" variant="omega">
            {formatMessage({
              id: 'content-releases.content-manager-edit-view.remove-from-release',
              defaultMessage: 'Remove from release',
            })}
          </Typography>
        </Flex>
      </StyledMenuItem>
    </CheckPermissions>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseActionEntryLinkItem
 * -----------------------------------------------------------------------------------------------*/
interface ReleaseActionEntryLinkItemProps {
  contentTypeUid: ReleaseAction['contentType'];
  entryId: ReleaseAction['entry']['id'];
  locale: ReleaseAction['locale'];
}

const ReleaseActionEntryLinkItem = ({
  contentTypeUid,
  entryId,
  locale,
}: ReleaseActionEntryLinkItemProps) => {
  const { formatMessage } = useIntl();
  // Confirm user has permissions to access the entry for the given locale
  const collectionTypePermissions = useTypedSelector(
    (state) => state.rbacProvider.collectionTypesRelatedPermissions
  );
  const updatePermissions = contentTypeUid
    ? collectionTypePermissions[contentTypeUid]?.['plugin::content-manager.explorer.update']
    : [];
  const canUpdateEntryForLocale = Boolean(
    !locale ||
      updatePermissions?.find((permission: Permission) =>
        permission.properties?.locales?.includes(locale)
      )
  );

  return (
    <CheckPermissions
      permissions={[
        {
          action: 'plugin::content-manager.explorer.update',
          subject: contentTypeUid,
        },
      ]}
    >
      {canUpdateEntryForLocale && (
        <StyledMenuItem>
          <Link
            as={NavLink}
            // @ts-expect-error TODO: This component from DS is not using types from NavLink
            to={{
              pathname: `/content-manager/collection-types/${contentTypeUid}/${entryId}`,
              search: locale && `?plugins[i18n][locale]=${locale}`,
            }}
            startIcon={<Icon as={Pencil} width={3} height={3} />}
          >
            <Typography variant="omega">
              {formatMessage({
                id: 'content-releases.content-manager-edit-view.edit-entry',
                defaultMessage: 'Edit entry',
              })}
            </Typography>
          </Link>
        </StyledMenuItem>
      )}
    </CheckPermissions>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EditReleaseItem
 * -----------------------------------------------------------------------------------------------*/
interface EditReleaseItemProps {
  releaseId: Release['id'];
}

const EditReleaseItem = ({ releaseId }: EditReleaseItemProps) => {
  const { formatMessage } = useIntl();

  return (
    <StyledMenuItem>
      <Link
        href={`/admin/plugins/content-releases/${releaseId}`}
        startIcon={<Icon as={Pencil} width={3} height={3} />}
        isExternal={false}
      >
        <Typography variant="omega">
          {formatMessage({
            id: 'content-releases.content-manager-edit-view.edit-release',
            defaultMessage: 'Edit release',
          })}
        </Typography>
      </Link>
    </StyledMenuItem>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

interface RootProps {
  children: React.ReactNode;
  hasTriggerBorder?: boolean;
}

const Root = ({ children, hasTriggerBorder = false }: RootProps) => {
  const { formatMessage } = useIntl();

  return (
    // A user can access the dropdown if they have permissions to delete a release-action OR update a release
    <CheckPermissions permissions={[...PERMISSIONS.deleteAction, ...PERMISSIONS.update]}>
      <Menu.Root>
        {/* 
          TODO Fix in the DS
          - as={IconButton} has TS error:  Property 'icon' does not exist on type 'IntrinsicAttributes & TriggerProps & RefAttributes<HTMLButtonElement>'
          - The Icon doesn't actually show unless you hack it with some padding...and it's still a little strange
         */}
        <Menu.Trigger
          as={hasTriggerBorder ? StyledIconButton : IconButton}
          paddingLeft={2}
          paddingRight={2}
          aria-label={formatMessage({
            id: 'content-releases.content-manager-edit-view.release-action-menu',
            defaultMessage: 'Release action options',
          })}
          // @ts-expect-error See above
          icon={<More />}
        />
        {/*
          TODO: Using Menu instead of SimpleMenu mainly because there is no positioning provided from the DS,
          Refactor this once fixed in the DS
         */}
        <Menu.Content top={1} popoverPlacement="bottom-end">
          {children}
        </Menu.Content>
      </Menu.Root>
    </CheckPermissions>
  );
};

export const ReleaseActionMenu = {
  Root,
  EditReleaseItem,
  DeleteReleaseActionItem,
  ReleaseActionEntryLinkItem,
};
