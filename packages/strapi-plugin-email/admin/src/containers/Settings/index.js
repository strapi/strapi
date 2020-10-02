import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Header } from '@buffetjs/custom';
import { Play } from '@buffetjs/icons';
import { FormBloc, request, SettingsPageTitle, SizedInput } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const [isTestButtonLoading, setIsTestButtonLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [config, setConfig] = useState({
    provider: '',
    settings: { defaultFrom: '', defaultReplyTo: '' },
  });
  const [providers, setProviders] = useState([]);

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
          formatMessage(
            {
              id: getTrad('Settings.notification.test.success'),
            },
            { to }
          )
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

  useEffect(() => {
    const fetchEmailSettings = () => {
      setShowLoader(true);

      request('/email/settings', {
        method: 'GET',
      })
        .then(data => {
          setConfig(data.config);
          setProviders(data.providers);
        })
        .catch(() =>
          strapi.notification.error(
            formatMessage({ id: getTrad('Settings.notification.config.error') })
          )
        )
        .finally(() => setShowLoader(false));
    };

    fetchEmailSettings();
  }, [formatMessage]);

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>
        <form>
          <Header actions={headerActions} title={{ label: pageTitle }} isLoading={showLoader} />
          <FormBloc title="Configuration" isLoading={showLoader}>
            <SizedInput
              disabled
              label={getTrad('Settings.form.label.defaultFrom')}
              name="default-from"
              placeholder={getTrad('Settings.form.placeholder.defaultFrom')}
              size={{ xs: 6 }}
              type="text"
              value={config.provider}
            />
            <SizedInput
              disabled
              label={getTrad('Settings.form.label.defaultReplyTo')}
              name="default-reply-to"
              placeholder={getTrad('Settings.form.placeholder.defaultReplyTo')}
              size={{ xs: 6 }}
              type="text"
              value={config.settings.defaultReplyTo}
            />
            <SizedInput
              discription={(
                <a key="website" href="https://strapi.io" target="_blank" rel="noopener noreferrer">
                  Strapi
                </a>
              )}
              disabled
              label={getTrad('Settings.form.label.provider')}
              name="provider"
              options={providers}
              size={{ xs: 6 }}
              type="select"
              value={config.provider}
            />
          </FormBloc>
        </form>
      </div>
    </>
  );
};

export default SettingsPage;
