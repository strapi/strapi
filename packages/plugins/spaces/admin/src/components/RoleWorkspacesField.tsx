import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

import { getWorkspacesBindingInitialValue, WorkspacesBindingCard } from './WorkspacesBindingCard';

import type { RoleFormExtensionComponentProps } from '@strapi/admin/strapi-admin';

/**
 * "Available in workspaces" block on the admin role edit page, mounted through
 * the admin's `registerRoleFormExtension` seam (field name: `spaces`). Users
 * holding the role belong to the bound workspaces.
 */
export const RoleWorkspacesField = ({
  value,
  onChange,
  disabled,
}: RoleFormExtensionComponentProps) => {
  const { formatMessage } = useIntl();

  return (
    <WorkspacesBindingCard
      value={value}
      onChange={(next) => onChange(next)}
      disabled={disabled}
      hint={formatMessage({
        id: getTranslation('roles.workspaces.hint'),
        defaultMessage:
          'Users holding this role belong to these workspaces. With every workspace checked the role is available everywhere.',
      })}
    />
  );
};

export const getRoleWorkspacesInitialValue = getWorkspacesBindingInitialValue;
