import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { Header } from '@buffetjs/custom';
import { Play } from '@buffetjs/icons';
import { FormBloc, request, SettingsPageTitle, SizedInput } from 'strapi-helper-plugin';
import ListBaselineAlignment from 'strapi-plugin-users-permissions/admin/src/components/ListBaselineAlignment';
import form from './form';
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
          <ListBaselineAlignment />
          <FormBloc title="Configuration" isLoading={showLoader}>
            {form.map(input => {
              input.options = input.name === 'provider' ? providers : [];

              return (
                <SizedInput key={input.name} {...input} disabled value={get(config, input.name)} />
              );
            })}
          </FormBloc>
        </form>
      </div>
    </>
  );
};

export default SettingsPage;
