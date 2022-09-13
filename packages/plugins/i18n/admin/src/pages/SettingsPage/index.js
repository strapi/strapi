import React from 'react';
import { useRBAC } from '@strapi/helper-plugin';
import LocaleSettingsPage from './LocaleSettingsPage';
import i18nPermissions from '../../permissions';

const ProtectedLocaleSettingsPage = () => {
  const {
    isLoading,
    allowedActions: { canRead, canUpdate, canCreate, canDelete },
  } = useRBAC(i18nPermissions);

  if (isLoading) {
    return null;
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
