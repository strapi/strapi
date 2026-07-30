import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

import { getWorkspacesBindingInitialValue, WorkspacesBindingCard } from './WorkspacesBindingCard';

import type { TokenFormExtensionComponentProps } from '@strapi/admin/strapi-admin';

/**
 * "Available in workspaces" block on the API token create/edit page, mounted
 * through the admin's `registerTokenFormExtension` seam (field name: `spaces`).
 * A bound token only operates inside its workspaces, whatever
 * `X-Strapi-Space-Id` value the caller sends.
 */
export const TokenWorkspacesField = ({
  value,
  onChange,
  disabled,
}: TokenFormExtensionComponentProps) => {
  const { formatMessage } = useIntl();

  return (
    <WorkspacesBindingCard
      value={value}
      onChange={(next) => onChange(next)}
      disabled={disabled}
      hint={formatMessage({
        id: getTranslation('tokens.workspaces.hint'),
        defaultMessage:
          'The token can only read and write inside these workspaces — sending another workspace in the X-Strapi-Space-Id header is refused. With every workspace checked the token is platform-wide.',
      })}
    />
  );
};

export const getTokenWorkspacesInitialValue = getWorkspacesBindingInitialValue;
