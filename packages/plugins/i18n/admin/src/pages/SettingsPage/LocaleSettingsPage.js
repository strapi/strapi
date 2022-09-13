import React, { useState } from 'react';
import PropTypes from 'prop-types';
import LocaleList from '../../components/LocaleList';

const LocaleSettingsPage = ({
  canReadLocale,
  canCreateLocale,
  canDeleteLocale,
  canUpdateLocale,
}) => {
  const [isOpenedCreateModal, setIsOpenedCreateModal] = useState(false);

  const handleToggleModalCreate = canCreateLocale
    ? () => setIsOpenedCreateModal((s) => !s)
    : undefined;

  return canReadLocale ? (
    <LocaleList
      canUpdateLocale={canUpdateLocale}
      canDeleteLocale={canDeleteLocale}
      onToggleCreateModal={handleToggleModalCreate}
      isCreating={isOpenedCreateModal}
    />
  ) : null;
};

LocaleSettingsPage.propTypes = {
  canReadLocale: PropTypes.bool.isRequired,
  canCreateLocale: PropTypes.bool.isRequired,
  canUpdateLocale: PropTypes.bool.isRequired,
  canDeleteLocale: PropTypes.bool.isRequired,
};

export default LocaleSettingsPage;
