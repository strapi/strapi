import * as React from 'react';

import { ConfirmDialog, useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import { Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useDeleteRoleMutation, useGetRoleQuery } from '../../../services/roles';
import { getTranslation } from '../../../utils/getTranslation';

import { NamedByWarning } from './ConditionNamesList';

import type { RoleListItem } from '../../../../../shared/contracts/roles';

/**
 * The role new users are given, which is where users left with no role go. It is Authenticated
 * until the sign-in settings let a project choose another.
 */
const FALLBACK_DEFAULT_ROLE_NAME = 'Authenticated';

interface DeleteRoleDialogProps {
  /** The role to delete. The dialog is open while there is one. */
  role: RoleListItem | null;
  defaultRole?: RoleListItem;
  onClose: () => void;
}

/**
 * Asks before a role is deleted and says what happens to the people who hold it. It never asks
 * for a replacement role: the users keep their other roles and anyone left with none gets the
 * default role.
 */
const DeleteRoleDialog = ({ role, defaultRole, onClose }: DeleteRoleDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [deleteRole] = useDeleteRoleMutation();

  const defaultRoleName = defaultRole?.name ?? FALLBACK_DEFAULT_ROLE_NAME;
  // The role's own answer carries the checks that name it, whatever the admin may read elsewhere
  const { data: detail } = useGetRoleQuery(role?.documentId ?? '', { skip: role === null });
  const namedBy = detail?.namedBy ?? [];

  const handleConfirm = async () => {
    if (!role) {
      return;
    }

    const result = await deleteRole(role.documentId);

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });

      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage(
        {
          id: getTranslation('roles.delete.success'),
          defaultMessage:
            '{name} deleted.{moved, plural, =0 {} one { # user now has {role}.} other { # users now have {role}.}}',
        },
        { name: role.name, moved: result.data.movedToDefault, role: defaultRoleName }
      ),
    });
  };

  // Moving users to the default role removes two-factor only where the default role has none
  const losesTwoFactor = Boolean(role?.requireTwoFactor) && !defaultRole?.requireTwoFactor;

  return (
    <Dialog.Root open={role !== null} onOpenChange={(open) => !open && onClose()}>
      {role && (
        <ConfirmDialog onConfirm={handleConfirm}>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Typography>
              {formatMessage(
                {
                  id: getTranslation('roles.delete.question'),
                  defaultMessage: 'Delete <b>{name}</b>?',
                },
                {
                  name: role.name,
                  b: (chunks: React.ReactNode) => (
                    <Typography fontWeight="bold">{chunks}</Typography>
                  ),
                }
              )}
            </Typography>
            {namedBy.length > 0 && <NamedByWarning change="delete" namedBy={namedBy} />}
            {role.usersCount > 0 && (
              <>
                <Typography textColor="neutral600">
                  {formatMessage(
                    {
                      id: getTranslation('roles.delete.users'),
                      defaultMessage:
                        '{count, plural, one {# user has} other {# users have}} this role. They keep their other roles; anyone left with none gets {role} and its permissions.',
                    },
                    { count: role.usersCount, role: defaultRoleName }
                  )}
                </Typography>
                {losesTwoFactor && (
                  <Typography textColor="neutral600">
                    {formatMessage({
                      id: getTranslation('roles.delete.two-factor'),
                      defaultMessage: 'They no longer need two-factor authentication.',
                    })}
                  </Typography>
                )}
              </>
            )}
          </Flex>
        </ConfirmDialog>
      )}
    </Dialog.Root>
  );
};

export { DeleteRoleDialog };
export type { DeleteRoleDialogProps };
