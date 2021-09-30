import React from 'react';
import { useIntl } from 'react-intl';
import { SettingsPageTitle } from '@strapi/helper-plugin';
import { HeaderLayout } from '@strapi/parts/Layout';
import getTrad from '../../../utils/getTrad';

const EmailHeader = () => {
  const { formatMessage } = useIntl();

  return (
    <>
      <SettingsPageTitle
        name={formatMessage({
          id: getTrad('Settings.email.plugin.title'),
          defaultMessage: 'Email settings',
        })}
      />
      <HeaderLayout
        id="title"
        title={formatMessage({
          id: getTrad('Settings.email.plugin.title'),
          defaultMessage: 'Email settings',
        })}
        subtitle={formatMessage({
          id: getTrad('Settings.email.plugin.subTitle'),
          defaultMessage: 'Test the settings for the email plugin',
        })}
      />
    </>
  );
};

export default EmailHeader;
