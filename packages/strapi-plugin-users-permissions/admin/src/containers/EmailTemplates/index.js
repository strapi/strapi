import React from 'react';
import { useIntl } from 'react-intl';
import { SettingsPageTitle } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const EmailTemplatesPage = () => {
  const { formatMessage } = useIntl();
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.emailTemplates') });

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>Email</div>
    </>
  );
};

export default EmailTemplatesPage;
