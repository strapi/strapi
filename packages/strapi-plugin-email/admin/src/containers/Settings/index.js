import React, { useState, useEffect } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import { Header } from '@buffetjs/custom';
import { Envelope } from '@buffetjs/icons';
import {
  FormBloc,
  request,
  SettingsPageTitle,
  SizedInput,
  validateInput,
} from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';
import { AlignedButton, Text } from './components';

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
  const [testSuccess, setTestSuccess] = useState(false);

  const title = formatMessage({ id: getTrad('Settings.title') });

  const handleEmailTest = () => {
    setIsTestButtonLoading(true);

    request('/email/test', {
      method: 'POST',
      body: { to: testAddress },
    })
      .then(() => {
        setTestSuccess(true);
        strapi.notification.success(
          formatMessage({ id: getTrad('Settings.notification.test.success') }, { to: testAddress })
        );
      })
      .catch(() =>
        strapi.notification.error(
          formatMessage({ id: getTrad('Settings.notification.test.error') }, { to: testAddress })
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
          setTestAddress(get(data, 'config.settings.testAddress'));
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
      <SettingsPageTitle name={title} />
      <div>
        <form>
          <Header
            title={{ label: title }}
            content={formatMessage({ id: getTrad('Settings.subTitle') })}
            isLoading={showLoader}
          />
          <FormBloc
            title={formatMessage({ id: getTrad('Settings.form.title.config') })}
            isLoading={showLoader}
          >
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
            <Text>
              <FormattedMessage
                id={getTrad('Settings.form.text.configuration')}
                values={{
                  file: <code>./config/plugins.js</code>,
                  link: (
                    <a
                      href="https://strapi.io/documentation/v3.x/plugins/email.html#configure-the-plugin"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      link
                    </a>
                  ),
                }}
              />
            </Text>
          </FormBloc>
          <FormBloc
            title={formatMessage({ id: getTrad('Settings.form.title.test') })}
            isLoading={showLoader}
          >
            <SizedInput
              label={getTrad('Settings.form.label.testAddress')}
              name="test-address"
              placeholder={getTrad('Settings.form.placeholder.testAddress')}
              onChange={event => setTestAddress(event.target.value)}
              size={{ xs: 6 }}
              type="email"
              value={testAddress}
            />
            <AlignedButton
              color="success"
              disabled={testSuccess || !validateEmail(testAddress)}
              icon={<Envelope style={{ verticalAlign: 'middle' }} />}
              isLoading={isTestButtonLoading}
              onClick={handleEmailTest}
              style={{ minWidth: 150, fontWeight: 600 }}
              type="button"
            >
              {formatMessage({ id: getTrad('Settings.button.test-email') })}
            </AlignedButton>
          </FormBloc>
        </form>
      </div>
    </>
  );
};

export default SettingsPage;
