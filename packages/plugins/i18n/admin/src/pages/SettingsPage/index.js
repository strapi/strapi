import React from 'react';

import { useRBAC } from '@strapi/helper-plugin';

import { pluginPermissions } from '../../permissions';

import LocaleSettingsPage from './LocaleSettingsPage';

const ProtectedLocaleSettingsPage = () => {
  const {
    isLoading,
    allowedActions: { canRead, canUpdate, canCreate, canDelete },
  } = useRBAC(pluginPermissions);

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
