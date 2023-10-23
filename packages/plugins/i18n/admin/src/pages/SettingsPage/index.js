import React from 'react';

import { useRBAC } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../../constants';

import LocaleSettingsPage from './LocaleSettingsPage';

const ProtectedLocaleSettingsPage = () => {
  const {
    isLoading,
    allowedActions: { canRead, canUpdate, canCreate, canDelete },
  } = useRBAC(PERMISSIONS);

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
