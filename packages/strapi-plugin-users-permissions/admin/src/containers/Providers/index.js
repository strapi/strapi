import React from 'react';
import { useIntl } from 'react-intl';
import { SettingsPageTitle } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const ProvidersPage = () => {
  const { formatMessage } = useIntl();
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.providers') });

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>Providers</div>
    </>
  );
};

export default ProvidersPage;
