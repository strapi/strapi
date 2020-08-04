import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Header } from '@buffetjs/custom';
import { SettingsPageTitle } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const EmailTemplatesPage = () => {
  const { formatMessage } = useIntl();
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.emailTemplates') });

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>
        <Header title={{ label: pageTitle }} />
      </div>
    </>
  );
};

export default EmailTemplatesPage;
