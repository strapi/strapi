import React from 'react';
import { useUserPermissions } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import LocaleSettingsPage from './LocaleSettingsPage';
import i18nPermissions from '../../permissions';
import { getTrad } from '../../utils';

const ProtectedLocaleSettingsPage = () => {
  const { formatMessage } = useIntl();
  const {
    isLoading,
    allowedActions: { canRead, canUpdate, canCreate, canDelete },
  } = useUserPermissions(i18nPermissions);

  if (isLoading) {
    return (
      <div>
        <p>{formatMessage({ id: getTrad('Settings.permissions.loading') })}</p>
      </div>
    );
  }

  return (
    <LocaleSettingsPage
      canReadLocale={canRead}
      canCreateLocale={canCreate}
      canUpdateLocale={canUpdate}
      canDeleteLocale={canDelete}
    />
  );
};

export default ProtectedLocaleSettingsPage;
