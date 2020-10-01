import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { Header } from '@buffetjs/custom';
import { Play } from '@buffetjs/icons';
import { request, SettingsPageTitle } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const [isTestButtonLoading, setIsTestButtonLoading] = useState(false);

  const to = 'mattiasvandebelt@gmail.com';

  const pageTitle = formatMessage({ id: getTrad('Settings.PageTitle') });

  const handleEmailTest = () => {
    setIsTestButtonLoading(!isTestButtonLoading);

    request('/email/test', {
      method: 'POST',
      body: { to },
    })
      .then(() =>
        strapi.notification.success(
          formatMessage({ id: getTrad('Settings.notification.test.success') }, { to })
        )
      )
      .catch(() =>
        strapi.notification.error(
          formatMessage({ id: getTrad('Settings.notification.test.error') })
        )
      )
      .finally(() => setIsTestButtonLoading(false));
  };

  const headerActions = [
    {
      onClick: () => {
        handleEmailTest();
      },
      color: 'success',
      label: formatMessage({
        id: getTrad('Settings.actions.test-email'),
      }),
      isLoading: isTestButtonLoading,
      type: 'submit',
      style: {
        minWidth: 150,
        fontWeight: 600,
      },
      icon: <Play width="8px" height="10px" fill={isTestButtonLoading ? '#b4b6ba' : '#ffffff'} />,
    },
  ];

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>
        <Header actions={headerActions} title={{ label: pageTitle }} isLoading={false} />
      </div>
    </>
  );
};

export default SettingsPage;
