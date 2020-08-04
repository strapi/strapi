import React from 'react';
import { useIntl } from 'react-intl';
import { SettingsPageTitle } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const AdvancedSettingsPage = () => {
  const { formatMessage } = useIntl();
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.advancedSettings') });

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>Advanced settings</div>
    </>
  );
};

export default AdvancedSettingsPage;
