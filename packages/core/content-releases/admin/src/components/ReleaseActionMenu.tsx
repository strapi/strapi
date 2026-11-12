import * as React from 'react';

import {
  useAPIErrorHandler,
  useNotification,
  useRBAC,
  isFetchError,
} from '@strapi/admin/strapi-admin';
import { Menu, AccessibleIcon, IconButton } from '@strapi/design-system';
import { Cross, More, Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { DeleteReleaseAction } from '../../../shared/contracts/release-actions';
import { Release } from '../../../shared/contracts/releases';
import { PERMISSIONS } from '../constants';
import { useDeleteReleaseActionMutation } from '../services/release';

// TODO: has to be fixed in the DS - https://github.com/strapi/design-system/issues/1934
const StyledMenuLink = styled(Menu.Item)`
  span,
  &:hover span {
    color: ${({ theme }) => theme.colors['neutral800']};
  }

  svg path,
  &:hover svg path {
    fill: ${({ theme }) => theme.colors['neutral500']};
  }
`;

/* -------------------------------------------------------------------------------------------------
 * useDeleteReleaseAction
 * -----------------------------------------------------------------------------------------------*/
interface DeleteReleaseActionItemProps {
  releaseId: DeleteReleaseAction.Request['params']['releaseId'];
  actionId: DeleteReleaseAction.Request['params']['actionId'];
}

/**
 * "Remove from release", shared by the "..." menu item and the inline icon button
 */
const useDeleteReleaseAction = ({ releaseId, actionId }: DeleteReleaseActionItemProps) => {
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
      if (isFetchError(response.error)) {
        // Handle fetch error
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

  return {
    canDeleteAction,
    handleDeleteAction,
    label: formatMessage({
      id: 'content-releases.content-manager-edit-view.remove-from-release',
      defaultMessage: 'Remove from release',
    }),
  };
};

/* -------------------------------------------------------------------------------------------------
 * DeleteReleaseActionItem
 * -----------------------------------------------------------------------------------------------*/
const DeleteReleaseActionItem = (props: DeleteReleaseActionItemProps) => {
  const { canDeleteAction, handleDeleteAction, label } = useDeleteReleaseAction(props);

  if (!canDeleteAction) {
    return null;
  }

  return (
    <Menu.Item variant="danger" startIcon={<Cross />} onSelect={handleDeleteAction}>
      {label}
    </Menu.Item>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DeleteReleaseActionButton
 * -----------------------------------------------------------------------------------------------*/
// Same "Remove from release" action as DeleteReleaseActionItem, rendered as a direct icon button for
// rows that show their actions inline (next to the open-entry eye) instead of inside the "..." menu.
const DeleteReleaseActionButton = (props: DeleteReleaseActionItemProps) => {
  const { canDeleteAction, handleDeleteAction, label } = useDeleteReleaseAction(props);

  if (!canDeleteAction) {
    return null;
  }

  return (
    <IconButton variant="ghost" onClick={handleDeleteAction} label={label}>
      <Cross />
    </IconButton>
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
    <StyledMenuLink
      /* @ts-expect-error inference isn't working in DS */
      tag={NavLink}
      isLink
      to={`/plugins/content-releases/${releaseId}`}
      startIcon={<Pencil />}
    >
      {formatMessage({
        id: 'content-releases.content-manager-edit-view.edit-release',
        defaultMessage: 'Edit release',
      })}
    </StyledMenuLink>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

interface RootProps {
  children: React.ReactNode;
  hasTriggerBorder?: boolean;
}

const Root = ({ children }: RootProps) => {
  const { formatMessage } = useIntl();

  const { allowedActions } = useRBAC(PERMISSIONS);

  return (
    // A user can access the dropdown if they have permissions to delete a release-action OR update a release
    allowedActions.canDeleteAction || allowedActions.canUpdate ? (
      <Menu.Root>
        <StyledMoreButton
          variant="tertiary"
          endIcon={null}
          tag={IconButton}
          icon={
            <AccessibleIcon
              label={formatMessage({
                id: 'content-releases.content-manager-edit-view.release-action-menu',
                defaultMessage: 'Release action options',
              })}
            >
              <More />
            </AccessibleIcon>
          }
        />
        <Menu.Content top={1} popoverPlacement="bottom-end">
          {children}
        </Menu.Content>
      </Menu.Root>
    ) : null
  );
};

const StyledMoreButton = styled(Menu.Trigger)`
  & > span {
    display: flex;
  }
`;

export const ReleaseActionMenu = {
  Root,
  EditReleaseItem,
  DeleteReleaseActionItem,
  DeleteReleaseActionButton,
};
