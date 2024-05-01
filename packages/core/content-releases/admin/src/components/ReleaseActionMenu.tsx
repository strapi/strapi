import * as React from 'react';

import { useAPIErrorHandler, useNotification, useAuth, useRBAC } from '@strapi/admin/strapi-admin';
import { Flex, IconButton, Typography, Menu, Link } from '@strapi/design-system';
import { Cross, More, Pencil } from '@strapi/icons';
import { isAxiosError } from 'axios';
import { useIntl } from 'react-intl';
import { Link as NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { DeleteReleaseAction, ReleaseAction } from '../../../shared/contracts/release-actions';
import { Release } from '../../../shared/contracts/releases';
import { PERMISSIONS } from '../constants';
import { useDeleteReleaseActionMutation } from '../services/release';

const StyledMenuItem = styled(Menu.Item)<{ variant?: 'neutral' | 'danger' }>`
  &:hover {
    background: ${({ theme, variant = 'neutral' }) => theme.colors[`${variant}100`]};

    svg {
      fill: ${({ theme, variant = 'neutral' }) => theme.colors[`${variant}600`]};
    }

    a {
      color: ${({ theme }) => theme.colors.neutral800};
    }
  }

  svg {
    fill: ${({ theme, variant = 'neutral' }) => theme.colors[`${variant}600`]};
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
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const [deleteReleaseAction] = useDeleteReleaseActionMutation();
  const {
    allowedActions: { canDeleteAction },
  } = useRBAC(PERMISSIONS);

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
          type: 'danger',
          message: formatAPIError(response.error),
        });
      } else {
        // Handle generic error
        toggleNotification({
          type: 'danger',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
        });
      }
    }
  };

  if (!canDeleteAction) {
    return null;
  }

  return (
    <StyledMenuItem variant="danger" onSelect={handleDeleteAction}>
      <Flex gap={2}>
        <Cross width="1.6rem" height="1.6rem" />
        <Typography textColor="danger600" variant="omega">
          {formatMessage({
            id: 'content-releases.content-manager-edit-view.remove-from-release',
            defaultMessage: 'Remove from release',
          })}
        </Typography>
      </Flex>
    </StyledMenuItem>
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
  const userPermissions = useAuth('ReleaseActionEntryLinkItem', (state) => state.permissions);

  // Confirm user has permissions to access the entry for the given locale
  const canUpdateEntryForLocale = React.useMemo(() => {
    const updatePermissions = userPermissions.find(
      (permission) =>
        permission.subject === contentTypeUid &&
        permission.action === 'plugin::content-manager.explorer.update'
    );

    if (!updatePermissions) {
      return false;
    }

    return Boolean(!locale || updatePermissions.properties?.locales?.includes(locale));
  }, [contentTypeUid, locale, userPermissions]);

  const {
    allowedActions: { canUpdate: canUpdateContentType },
  } = useRBAC({
    updateContentType: [
      {
        action: 'plugin::content-manager.explorer.update',
        subject: contentTypeUid,
      },
    ],
  });

  if (!canUpdateContentType || !canUpdateEntryForLocale) {
    return null;
  }

  return (
    <StyledMenuItem
      forwardedAs={NavLink}
      isLink
      to={{
        pathname: `/content-manager/collection-types/${contentTypeUid}/${entryId}`,
        search: locale && `?plugins[i18n][locale]=${locale}`,
      }}
    >
      <Flex gap={2}>
        <Pencil width="1.6rem" height="1.6rem" />
        <Typography variant="omega">
          {formatMessage({
            id: 'content-releases.content-manager-edit-view.edit-entry',
            defaultMessage: 'Edit entry',
          })}
        </Typography>
      </Flex>
    </StyledMenuItem>
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
    <StyledMenuItem forwardedAs={NavLink} isLink to={`/plugins/content-releases/${releaseId}`}>
      <Flex gap={2}>
        <Pencil width="1.6rem" height="1.6rem" />
        <Typography variant="omega">
          {formatMessage({
            id: 'content-releases.content-manager-edit-view.edit-release',
            defaultMessage: 'Edit release',
          })}
        </Typography>
      </Flex>
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

  const { allowedActions } = useRBAC(PERMISSIONS);

  return (
    // A user can access the dropdown if they have permissions to delete a release-action OR update a release
    allowedActions.canDeleteAction || allowedActions.canUpdate ? (
      <Menu.Root>
        {/* 
          TODO Fix in the DS
          - tag={IconButton} has TS error:  Property 'icon' does not exist on type 'IntrinsicAttributes & TriggerProps & RefAttributes<HTMLButtonElement>'
          - The Icon doesn't actually show unless you hack it with some padding...and it's still a little strange
         */}
        <Menu.Trigger
          tag={hasTriggerBorder ? StyledIconButton : IconButton}
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
    ) : null
  );
};

export const ReleaseActionMenu = {
  Root,
  EditReleaseItem,
  DeleteReleaseActionItem,
  ReleaseActionEntryLinkItem,
};
