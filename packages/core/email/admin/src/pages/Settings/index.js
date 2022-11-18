import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import {
  getYupInnerErrors,
  CheckPagePermissions,
  useNotification,
  LoadingIndicatorPage,
  useOverlayBlocker,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import {
  Main,
  ContentLayout,
  Stack,
  Box,
  Grid,
  GridItem,
  Typography,
  TextInput,
  Button,
  useNotifyAT,
} from '@strapi/design-system';
import Envelop from '@strapi/icons/Envelop';
import Configuration from './components/Configuration';
import schema from '../../utils/schema';
import pluginPermissions from '../../permissions';
import { fetchEmailSettings, postEmailTest } from './utils/api';
import EmailHeader from './components/EmailHeader';
import getTrad from '../../utils/getTrad';

const ProtectedSettingsPage = () => (
  <CheckPagePermissions permissions={pluginPermissions.settings}>
    <SettingsPage />
  </CheckPagePermissions>
);

const SettingsPage = () => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { notifyStatus } = useNotifyAT();
  useFocusWhenNavigate();

  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [isTestAddressValid, setIsTestAddressValid] = useState(false);
  const [config, setConfig] = useState({
    provider: '',
    settings: { defaultFrom: '', defaultReplyTo: '', testAddress: '' },
  });

  useEffect(() => {
    setIsLoading(true);

    fetchEmailSettings()
      .then((config) => {
        notifyStatus(
          formatMessage({
            id: getTrad('Settings.email.plugin.notification.data.loaded'),
            defaultMessage: 'Email settings data has been loaded',
          })
        );

        setConfig(config);

        const testAddressFound = get(config, 'settings.testAddress');

        if (testAddressFound) {
          setTestAddress(testAddressFound);
        }
      })
      .catch(() =>
        toggleNotification({
          type: 'warning',
          message: formatMessage({
            id: getTrad('Settings.email.plugin.notification.config.error'),
            defaultMessage: 'Failed to retrieve the email config',
          }),
        })
      )
      .finally(() => setIsLoading(false));
  }, [formatMessage, toggleNotification, notifyStatus]);

  useEffect(() => {
    if (formErrors.email) {
      const input = document.querySelector('#test-address-input');
      input.focus();
    }
  }, [formErrors]);

  useEffect(() => {
    schema
      .validate({ email: testAddress }, { abortEarly: false })
      .then(() => setIsTestAddressValid(true))
      .catch(() => setIsTestAddressValid(false));
  }, [testAddress]);

  const handleChange = (e) => {
    setTestAddress(() => e.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await schema.validate({ email: testAddress }, { abortEarly: false });

      setIsSubmitting(true);
      lockApp();

      postEmailTest({ to: testAddress })
        .then(() => {
          toggleNotification({
            type: 'success',
            message: formatMessage(
              {
                id: getTrad('Settings.email.plugin.notification.test.success'),
                defaultMessage: 'Email test succeeded, check the {to} mailbox',
              },
              { to: testAddress }
            ),
          });
        })
        .catch(() => {
          toggleNotification({
            type: 'warning',
            message: formatMessage(
              {
                id: getTrad('Settings.email.plugin.notification.test.error'),
                defaultMessage: 'Failed to send a test mail to {to}',
              },
              { to: testAddress }
            ),
          });
        })
        .finally(() => {
          setIsSubmitting(false);
          unlockApp();
        });
    } catch (error) {
      setFormErrors(getYupInnerErrors(error));
    }
  };

  if (isLoading) {
    return (
      <Main labelledBy="title" aria-busy="true">
        <EmailHeader />
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
  }

  return (
    <Main labelledBy="title" aria-busy={isSubmitting}>
      <EmailHeader />
      <ContentLayout>
        <form onSubmit={handleSubmit}>
          <Stack spacing={7}>
            <Box
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Configuration config={config} />
            </Box>
            <Box
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Stack spacing={4}>
                <Typography variant="delta" as="h2">
                  {formatMessage({
                    id: getTrad('Settings.email.plugin.title.test'),
                    defaultMessage: 'Test email delivery',
                  })}
                </Typography>
                <Grid gap={5} alignItems="end">
                  <GridItem col={6} s={12}>
                    <TextInput
                      id="test-address-input"
                      name="test-address"
                      onChange={handleChange}
                      label={formatMessage({
                        id: getTrad('Settings.email.plugin.label.testAddress'),
                        defaultMessage: 'Recipient email',
                      })}
                      value={testAddress}
                      error={
                        formErrors.email?.id &&
                        formatMessage({
                          id: getTrad(`${formErrors.email?.id}`),
                          defaultMessage: 'This is an invalid email',
                        })
                      }
                      placeholder={formatMessage({
                        id: getTrad('Settings.email.plugin.placeholder.testAddress'),
                        defaultMessage: 'ex: developer@example.com',
                      })}
                    />
                  </GridItem>
                  <GridItem col={7} s={12}>
                    <Button
                      loading={isSubmitting}
                      disabled={!isTestAddressValid}
                      type="submit"
                      startIcon={<Envelop />}
                    >
                      {formatMessage({
                        id: getTrad('Settings.email.plugin.button.test-email'),
                        defaultMessage: 'Send test email',
                      })}
                    </Button>
                  </GridItem>
                </Grid>
              </Stack>
            </Box>
          </Stack>
        </form>
      </ContentLayout>
    </Main>
  );
};

export default ProtectedSettingsPage;
