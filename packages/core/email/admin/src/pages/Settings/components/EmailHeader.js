import React from 'react';
import { useIntl } from 'react-intl';
import { SettingsPageTitle } from '@strapi/helper-plugin';
import { HeaderLayout } from '@strapi/design-system';
import getTrad from '../../../utils/getTrad';

const EmailHeader = () => {
  const { formatMessage } = useIntl();

  return (
    <>
      <SettingsPageTitle
        name={formatMessage({
          id: getTrad('Settings.email.plugin.title'),
          defaultMessage: 'Configuration',
        })}
      />
      <HeaderLayout
        id="title"
        title={formatMessage({
          id: getTrad('Settings.email.plugin.title'),
          defaultMessage: 'Configuration',
        })}
        subtitle={formatMessage({
          id: getTrad('Settings.email.plugin.subTitle'),
          defaultMessage: 'Test the settings for the Email plugin',
        })}
      />
    </>
  );
};

export default EmailHeader;
