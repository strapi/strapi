import React, { useState, useEffect, useRef } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import { Header } from '@buffetjs/custom';
import { Envelope } from '@buffetjs/icons';
import { colors } from '@buffetjs/styles';
import {
  FormBloc,
  request,
  SettingsPageTitle,
  SizedInput,
  getYupInnerErrors,
  BaselineAlignment,
  CheckPagePermissions,
} from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';
import { AlignedButton, Text } from './components';
import schema from '../../utils/schema';
import pluginPermissions from '../../permissions';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const [formErrors, setFormErrors] = useState({});
  const [isTestButtonLoading, setIsTestButtonLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [config, setConfig] = useState({
    provider: '',
    settings: { defaultFrom: '', defaultReplyTo: '', testAddress: '' },
  });
  const [providers, setProviders] = useState([]);
  const [testAddress, setTestAddress] = useState();
  const [testSuccess, setTestSuccess] = useState(false);
  const isMounted = useRef(true);

  const title = formatMessage({ id: getTrad('Settings.title') });

  const handleSubmit = async event => {
    event.preventDefault();
    let errors = {};

    try {
      await schema.validate({ email: testAddress }, { abortEarly: false });

      try {
        setIsTestButtonLoading(true);

        await request('/email/test', {
          method: 'POST',
          body: { to: testAddress },
        });

        setTestSuccess(true);

        strapi.notification.success(
          formatMessage({ id: getTrad('Settings.notification.test.success') }, { to: testAddress })
        );
      } catch (err) {
        strapi.notification.error(
          formatMessage({ id: getTrad('Settings.notification.test.error') }, { to: testAddress })
        );
      } finally {
        if (isMounted.current) {
          setIsTestButtonLoading(false);
        }
      }
    } catch (error) {
      errors = getYupInnerErrors(error);
      setFormErrors(errors);
      console.log(errors);
    }
  };

  useEffect(() => {
    const fetchEmailSettings = () => {
      setShowLoader(true);

      request('/email/settings', {
        method: 'GET',
      })
        .then(data => {
          setConfig(data.config);
          setProviders([data.config.provider]);
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

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <>
      <CheckPagePermissions permissions={pluginPermissions.settings}>
        <SettingsPageTitle name={title} />
        <div>
          <form onSubmit={handleSubmit}>
            <Header
              title={{ label: title }}
              content={formatMessage({ id: getTrad('Settings.subTitle') })}
              isLoading={showLoader}
            />
            <BaselineAlignment top size="3px" />
            <FormBloc
              title={formatMessage({ id: getTrad('Settings.form.title.config') })}
              isLoading={showLoader}
            >
              <Text fontSize="md" lineHeight="18px">
                <FormattedMessage
                  id={getTrad('Settings.form.text.configuration')}
                  values={{
                    file: <code>./config/plugins.js</code>,
                    link: (
                      <a
                        href="https://strapi.io/documentation/developer-docs/latest/development/plugins/email.html#configure-the-plugin"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        link
                      </a>
                    ),
                  }}
                />
              </Text>
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
                value={`strapi-provider-email-${config.provider}`}
              />
            </FormBloc>
            <BaselineAlignment top size="32px" />
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
                error={formErrors.email}
              />
              <AlignedButton
                color="success"
                disabled={testSuccess}
                icon={(
                  <Envelope
                    fill={testSuccess ? colors.button.disabled.color : null}
                    style={{ verticalAlign: 'middle', marginRight: '10px' }}
                  />
                )}
                isLoading={isTestButtonLoading}
                style={{ fontWeight: 600 }}
                type="submit"
              >
                {formatMessage({ id: getTrad('Settings.button.test-email') })}
              </AlignedButton>
            </FormBloc>
          </form>
        </div>
      </CheckPagePermissions>
    </>
  );
};

export default SettingsPage;
