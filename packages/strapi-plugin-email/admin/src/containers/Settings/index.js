import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { Button } from '@buffetjs/core';
import { Header } from '@buffetjs/custom';
import { Play } from '@buffetjs/icons';
import {
  FormBloc,
  request,
  SettingsPageTitle,
  SizedInput,
  validateInput,
} from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const [isTestButtonLoading, setIsTestButtonLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [config, setConfig] = useState({
    provider: '',
    settings: { defaultFrom: '', defaultReplyTo: '', testAddress: '' },
  });
  const [providers, setProviders] = useState([]);
  const [testAddress, setTestAddress] = useState();

  const pageTitle = formatMessage({ id: getTrad('Settings.PageTitle') });

  const handleEmailTest = () => {
    setIsTestButtonLoading(!isTestButtonLoading);

    request('/email/test', {
      method: 'POST',
      body: { testAddress },
    })
      .then(() =>
        strapi.notification.success(
          formatMessage(
            {
              id: getTrad('Settings.notification.test.success'),
            },
            { to: testAddress }
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

  const validateEmail = email => !validateInput(email, {}, 'email').length;

  useEffect(() => {
    const fetchEmailSettings = () => {
      setShowLoader(true);

      request('/email/settings', {
        method: 'GET',
      })
        .then(data => {
          setConfig(data.config);
          setProviders(data.providers);
          setTestAddress(get(data, 'config.testAddress'));
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
          <Header title={{ label: pageTitle }} isLoading={showLoader} />
          <FormBloc title="Configuration" isLoading={showLoader}>
            <SizedInput
              disabled
              label={getTrad('Settings.form.label.defaultFrom')}
              name="default-from"
              placeholder={getTrad('Settings.form.placeholder.defaultFrom')}
              size={{ xs: 6 }}
              type="email"
              value={config.settings.defaultFrom}
            />
            <SizedInput
              disabled
              label={getTrad('Settings.form.label.defaultReplyTo')}
              name="default-reply-to"
              placeholder={getTrad('Settings.form.placeholder.defaultReplyTo')}
              size={{ xs: 6 }}
              type="email"
              value={config.settings.defaultReplyTo}
            />
            <SizedInput
              disabled
              label={getTrad('Settings.form.label.provider')}
              name="provider"
              options={providers}
              size={{ xs: 6 }}
              type="select"
              value={config.provider}
            />
          </FormBloc>
          <FormBloc title="Testing" isLoading={showLoader}>
            <SizedInput
              label={getTrad('Settings.form.label.testAddress')}
              name="test-address"
              placeholder={getTrad('Settings.form.placeholder.testAddress')}
              onChange={event => setTestAddress(event.target.value)}
              size={{ xs: 6 }}
              type="email"
              value={testAddress}
            />
            <Button
              color="success"
              disabled={!validateEmail(testAddress)}
              icon={(
                <Play
                  width="8px"
                  height="10px"
                  fill={isTestButtonLoading ? '#b4b6ba' : '#ffffff'}
                />
              )}
              isLoading={isTestButtonLoading}
              onClick={handleEmailTest}
              style={{ minWidth: 150, fontWeight: 600 }}
              type="button"
            >
              {formatMessage({ id: getTrad('Settings.button.test-email') })}
            </Button>
          </FormBloc>
        </form>
      </div>
    </>
  );
};

export default SettingsPage;
