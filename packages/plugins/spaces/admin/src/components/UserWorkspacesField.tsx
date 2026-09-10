import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

import { getWorkspacesBindingInitialValue, WorkspacesBindingCard } from './WorkspacesBindingCard';

import type { UserFormExtensionComponentProps } from '@strapi/admin/strapi-admin';

/**
 * "Workspaces" block on the admin user invite/edit forms, mounted through the
 * admin's `registerUserFormExtension` seam (field name: `spaces`). Direct
 * membership, on top of what the user's roles grant. Default workspace only:
 * elsewhere an invitee joins the workspace they are invited from.
 */
export const UserWorkspacesField = ({
  value,
  onChange,
  disabled,
}: UserFormExtensionComponentProps) => {
  const { formatMessage } = useIntl();

  return (
    <WorkspacesBindingCard
      value={value}
      onChange={(next) => onChange(next)}
      disabled={disabled}
      hint={formatMessage({
        id: getTranslation('users.workspaces.hint'),
        defaultMessage:
          'The user belongs to these workspaces, on top of the ones their roles grant. With every workspace checked the user is a member everywhere.',
      })}
    />
  );
};

export const getUserWorkspacesInitialValue = getWorkspacesBindingInitialValue;
