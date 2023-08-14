import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Option,
  Select,
  TextInput,
  Typography,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  getYupInnerErrors,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
} from '@strapi/helper-plugin';
import { Envelop } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useQuery, useMutation } from 'react-query';
import styled from 'styled-components';

import { PERMISSIONS } from '../../constants';
import schema from '../../utils/schema';

const DocumentationLink = styled.a`
  color: ${({ theme }) => theme.colors.primary600};
`;

const ProtectedSettingsPage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.settings}>
    <SettingsPage />
  </CheckPagePermissions>
);

const SettingsPage = () => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { get, post } = useFetchClient();
  const { data, isLoading } = useQuery(['email', 'settings'], async () => {
    const {
      data: { config },
    } = await get('/email/settings');

    return config;
  });

  const mutation = useMutation(
    (body) => post('/email/test', body),
    {
      onError() {
        toggleNotification({
          type: 'warning',
          message: formatMessage(
            {
              id: 'email.Settings.email.plugin.notification.test.error',
              defaultMessage: 'Failed to send a test mail to {to}',
            },
            { to: testAddress }
          ),
        });
      },

      onSuccess() {
        toggleNotification({
          type: 'success',
          message: formatMessage(
            {
              id: 'email.Settings.email.plugin.notification.test.success',
              defaultMessage: 'Email test succeeded, check the {to} mailbox',
            },
            { to: testAddress }
          ),
        });
      },
    },
    {
      retry: false,
    }
  );

  useFocusWhenNavigate();

  const [formErrors, setFormErrors] = React.useState({});
  const [testAddress, setTestAddress] = React.useState('');
  const [isTestAddressValid, setIsTestAddressValid] = React.useState(false);

  React.useEffect(() => {
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
    } catch (error) {
      setFormErrors(getYupInnerErrors(error));
    }

    lockApp();

    mutation.mutate({ to: testAddress });

    unlockApp();
  };

  return (
    <Main labelledBy="title" aria-busy={isLoading || mutation.isLoading}>
      <SettingsPageTitle
        name={formatMessage({
          id: 'email.Settings.email.plugin.title',
          defaultMessage: 'Configuration',
        })}
      />

      <HeaderLayout
        id="title"
        title={formatMessage({
          id: 'email.Settings.email.plugin.title',
          defaultMessage: 'Configuration',
        })}
        subtitle={formatMessage({
          id: 'email.Settings.email.plugin.subTitle',
          defaultMessage: 'Test the settings for the Email plugin',
        })}
      />

      <ContentLayout>
        {isLoading ? (
          <LoadingIndicatorPage />
        ) : (
          <form onSubmit={handleSubmit}>
            <Flex direction="column" alignItems="stretch" gap={7}>
              <Box
                background="neutral0"
                hasRadius
                shadow="filterShadow"
                paddingTop={6}
                paddingBottom={6}
                paddingLeft={7}
                paddingRight={7}
              >
                <Flex direction="column" alignItems="stretch" gap={4}>
                  <Flex direction="column" alignItems="stretch" gap={1}>
                    <Typography variant="delta" as="h2">
                      {formatMessage({
                        id: 'email.Settings.email.plugin.title.config',
                        defaultMessage: 'Configuration',
                      })}
                    </Typography>
                    <Typography>
                      {formatMessage(
                        {
                          id: 'email.Settings.email.plugin.text.configuration',
                          defaultMessage:
                            'The plugin is configured through the {file} file, checkout this {link} for the documentation.',
                        },
                        {
                          file: './config/plugins.js',
                          link: (
                            <DocumentationLink
                              href="https://docs.strapi.io/developer-docs/latest/plugins/email.html"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {formatMessage({
                                id: 'email.link',
                                defaultMessage: 'Link',
                              })}
                            </DocumentationLink>
                          ),
                        }
                      )}
                    </Typography>
                  </Flex>

                  <Grid gap={5}>
                    <GridItem col={6} s={12}>
                      <TextInput
                        name="shipper-email"
                        label={formatMessage({
                          id: 'email.Settings.email.plugin.label.defaultFrom',
                          defaultMessage: 'Default sender email',
                        })}
                        placeholder={formatMessage({
                          id: 'email.Settings.email.plugin.placeholder.defaultFrom',
                          defaultMessage: "ex: Strapi No-Reply '<'no-reply@strapi.io'>'",
                        })}
                        disabled
                        onChange={() => {}}
                        value={data.settings.defaultFrom}
                      />
                    </GridItem>

                    <GridItem col={6} s={12}>
                      <TextInput
                        name="response-email"
                        label={formatMessage({
                          id: 'email.Settings.email.plugin.label.defaultReplyTo',
                          defaultMessage: 'Default response email',
                        })}
                        placeholder={formatMessage({
                          id: 'email.Settings.email.plugin.placeholder.defaultReplyTo',
                          defaultMessage: `ex: Strapi '<'example@strapi.io'>'`,
                        })}
                        disabled
                        onChange={() => {}}
                        value={data.settings.defaultReplyTo}
                      />
                    </GridItem>

                    <GridItem col={6} s={12}>
                      <Select
                        name="email-provider"
                        label={formatMessage({
                          id: 'email.Settings.email.plugin.label.provider',
                          defaultMessage: 'Email provider',
                        })}
                        disabled
                        onChange={() => {}}
                        value={data.provider}
                      >
                        <Option value={data.provider}>{data.provider}</Option>
                      </Select>
                    </GridItem>
                  </Grid>
                </Flex>
              </Box>

              <Flex
                alignItems="stretch"
                background="neutral0"
                direction="column"
                gap={4}
                hasRadius
                shadow="filterShadow"
                paddingTop={6}
                paddingBottom={6}
                paddingLeft={7}
                paddingRight={7}
              >
                <Typography variant="delta" as="h2">
                  {formatMessage({
                    id: 'email.Settings.email.plugin.title.test',
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
                        id: 'email.Settings.email.plugin.label.testAddress',
                        defaultMessage: 'Recipient email',
                      })}
                      value={testAddress}
                      error={
                        formErrors.email?.id &&
                        formatMessage({
                          id: `email.${formErrors.email?.id}`,
                          defaultMessage: 'This is an invalid email',
                        })
                      }
                      placeholder={formatMessage({
                        id: 'email.Settings.email.plugin.placeholder.testAddress',
                        defaultMessage: 'ex: developer@example.com',
                      })}
                    />
                  </GridItem>
                  <GridItem col={7} s={12}>
                    <Button
                      loading={mutation.isLoading}
                      disabled={!isTestAddressValid}
                      type="submit"
                      startIcon={<Envelop />}
                    >
                      {formatMessage({
                        id: 'email.Settings.email.plugin.button.test-email',
                        defaultMessage: 'Send test email',
                      })}
                    </Button>
                  </GridItem>
                </Grid>
              </Flex>
            </Flex>
          </form>
        )}
      </ContentLayout>
    </Main>
  );
};

export default ProtectedSettingsPage;
