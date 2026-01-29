import * as React from 'react';

import { Page, useNotification, useFetchClient, Layouts } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Flex,
  Grid,
  SingleSelectOption,
  SingleSelect,
  TextInput,
  Typography,
  Field,
  Badge,
} from '@strapi/design-system';
import { Mail, Check, Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useQuery, useMutation } from 'react-query';
import { styled } from 'styled-components';
import { ValidationError } from 'yup';

import { parseEmailAddress } from '../../../shared/email-address-parser';
import { PERMISSIONS } from '../constants';
import { getYupInnerErrors } from '../utils/getYupInnerErrors';
import { schema } from '../utils/schema';

import type { EmailSettings } from '../../../shared/types';

const DocumentationLink = styled.a`
  color: ${({ theme }) => theme.colors.primary600};
`;

interface MutationBody {
  to: string;
}

export const ProtectedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.settings}>
    <SettingsPage />
  </Page.Protect>
);

const SettingsPage = () => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();

  const [testAddress, setTestAddress] = React.useState('');
  const [isTestAddressValid, setIsTestAddressValid] = React.useState(false);

  // TODO: I'm not sure how to type this. I think it should be Record<string, TranslationMessage> but that type is defined in the helper-plugin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formErrors, setFormErrors] = React.useState<Record<string, any>>({});

  const { data, isLoading } = useQuery(['email', 'settings'], async () => {
    const res = await get<EmailSettings>('/email/settings');
    const {
      data: { config, supportsVerify },
    } = res;

    return { ...config, supportsVerify };
  });

  const mutation = useMutation<void, Error, MutationBody>(
    async (body) => {
      await post('/email/test', body);
    },
    {
      onError() {
        toggleNotification!({
          type: 'danger',
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
        toggleNotification!({
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
      retry: false,
    }
  );

  const [connectionStatus, setConnectionStatus] = React.useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const verifyMutation = useMutation(
    async () => {
      await post('/email/verify', {});
    },
    {
      onMutate() {
        setConnectionStatus('loading');
      },
      onError() {
        setConnectionStatus('error');
        toggleNotification!({
          type: 'danger',
          message: formatMessage({
            id: 'email.Settings.email.plugin.notification.verify.error',
            defaultMessage: 'Connection verification failed',
          }),
        });
      },
      onSuccess() {
        setConnectionStatus('success');
        toggleNotification!({
          type: 'success',
          message: formatMessage({
            id: 'email.Settings.email.plugin.notification.verify.success',
            defaultMessage: 'Connection verified successfully',
          }),
        });
      },
      retry: false,
    }
  );

  React.useEffect(() => {
    schema
      .validate({ email: testAddress }, { abortEarly: false })
      .then(() => setIsTestAddressValid(true))
      .catch(() => setIsTestAddressValid(false));
  }, [testAddress]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTestAddress(() => event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await schema.validate({ email: testAddress }, { abortEarly: false });
    } catch (error) {
      if (error instanceof ValidationError) {
        setFormErrors(getYupInnerErrors(error));
      }
    }

    mutation.mutate({ to: testAddress });
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main labelledBy="title" aria-busy={isLoading || mutation.isLoading}>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: formatMessage({
              id: 'email.Settings.email.plugin.title',
              defaultMessage: 'Configuration',
            }),
          }
        )}
      </Page.Title>
      <Layouts.Header
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

      <Layouts.Content>
        {data && (
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
                    <Typography variant="delta" tag="h2">
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

                  <Grid.Root gap={5}>
                    {(() => {
                      const parsedFrom = parseEmailAddress(data.settings.defaultFrom);
                      const parsedReplyTo = parseEmailAddress(data.settings.defaultReplyTo);

                      return (
                        <>
                          {/* Sender Name - only show if name is present */}
                          {parsedFrom.name && (
                            <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                              <Field.Root name="sender-name">
                                <Field.Label>
                                  {formatMessage({
                                    id: 'email.Settings.email.plugin.label.senderName',
                                    defaultMessage: 'Default sender name',
                                  })}
                                </Field.Label>
                                <TextInput disabled readOnly value={parsedFrom.name} />
                              </Field.Root>
                            </Grid.Item>
                          )}

                          {/* Sender Email */}
                          <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                            <Field.Root name="sender-email">
                              <Field.Label>
                                {formatMessage({
                                  id: 'email.Settings.email.plugin.label.defaultFrom',
                                  defaultMessage: 'Default sender email',
                                })}
                              </Field.Label>
                              <TextInput
                                placeholder={formatMessage({
                                  id: 'email.Settings.email.plugin.placeholder.defaultFrom',
                                  defaultMessage: 'ex: no-reply@strapi.io',
                                })}
                                disabled
                                readOnly
                                value={parsedFrom.email}
                                type="email"
                              />
                            </Field.Root>
                          </Grid.Item>

                          {/* Reply-To Name - only show if name is present */}
                          {parsedReplyTo.name && (
                            <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                              <Field.Root name="reply-to-name">
                                <Field.Label>
                                  {formatMessage({
                                    id: 'email.Settings.email.plugin.label.replyToName',
                                    defaultMessage: 'Default reply-to name',
                                  })}
                                </Field.Label>
                                <TextInput disabled readOnly value={parsedReplyTo.name} />
                              </Field.Root>
                            </Grid.Item>
                          )}

                          {/* Reply-To Email */}
                          <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                            <Field.Root name="reply-to-email">
                              <Field.Label>
                                {formatMessage({
                                  id: 'email.Settings.email.plugin.label.defaultReplyTo',
                                  defaultMessage: 'Default response email',
                                })}
                              </Field.Label>
                              <TextInput
                                placeholder={formatMessage({
                                  id: 'email.Settings.email.plugin.placeholder.defaultReplyTo',
                                  defaultMessage: 'ex: support@strapi.io',
                                })}
                                disabled
                                readOnly
                                value={parsedReplyTo.email}
                                type="email"
                              />
                            </Field.Root>
                          </Grid.Item>
                        </>
                      );
                    })()}

                    <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                      <Field.Root name="email-provider">
                        <Field.Label>
                          {formatMessage({
                            id: 'email.Settings.email.plugin.label.provider',
                            defaultMessage: 'Email provider',
                          })}
                        </Field.Label>
                        <Flex gap={2}>
                          <SingleSelect disabled value={data.provider}>
                            <SingleSelectOption value={data.provider}>
                              {data.provider}
                            </SingleSelectOption>
                          </SingleSelect>
                          {connectionStatus === 'success' && (
                            <Badge backgroundColor="success100" textColor="success700">
                              <Flex gap={1}>
                                <Check width="1.2rem" height="1.2rem" />
                                {formatMessage({
                                  id: 'email.Settings.email.plugin.status.connected',
                                  defaultMessage: 'Connected',
                                })}
                              </Flex>
                            </Badge>
                          )}
                          {connectionStatus === 'error' && (
                            <Badge backgroundColor="danger100" textColor="danger700">
                              <Flex gap={1}>
                                <Cross width="1.2rem" height="1.2rem" />
                                {formatMessage({
                                  id: 'email.Settings.email.plugin.status.error',
                                  defaultMessage: 'Error',
                                })}
                              </Flex>
                            </Badge>
                          )}
                        </Flex>
                      </Field.Root>
                    </Grid.Item>

                    {data.supportsVerify && (
                      <Grid.Item col={6} xs={12} direction="column" alignItems="start">
                        <Field.Root name="verify-connection">
                          <Field.Label>
                            {formatMessage({
                              id: 'email.Settings.email.plugin.label.verifyConnection',
                              defaultMessage: 'Connection status',
                            })}
                          </Field.Label>
                          <Button
                            variant="secondary"
                            loading={verifyMutation.isLoading}
                            onClick={() => verifyMutation.mutate()}
                            type="button"
                          >
                            {formatMessage({
                              id: 'email.Settings.email.plugin.button.verify',
                              defaultMessage: 'Test connection',
                            })}
                          </Button>
                        </Field.Root>
                      </Grid.Item>
                    )}
                  </Grid.Root>
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
                <Typography variant="delta" tag="h2">
                  {formatMessage({
                    id: 'email.Settings.email.plugin.title.test',
                    defaultMessage: 'Test email delivery',
                  })}
                </Typography>

                <Grid.Root gap={5}>
                  <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                    <Field.Root
                      name="test-address"
                      error={
                        formErrors.email?.id &&
                        formatMessage({
                          id: `email.${formErrors.email?.id}`,
                          defaultMessage: 'This is not a valid email',
                        })
                      }
                    >
                      <Field.Label>
                        {formatMessage({
                          id: 'email.Settings.email.plugin.label.testAddress',
                          defaultMessage: 'Recipient email',
                        })}
                      </Field.Label>
                      <TextInput
                        onChange={handleChange}
                        value={testAddress}
                        placeholder={formatMessage({
                          id: 'email.Settings.email.plugin.placeholder.testAddress',
                          defaultMessage: 'ex: developer@example.com',
                        })}
                        type="email"
                      />
                    </Field.Root>
                  </Grid.Item>
                  <Grid.Item col={7} xs={12} direction="column" alignItems="start">
                    <Button
                      loading={mutation.isLoading}
                      disabled={!isTestAddressValid}
                      type="submit"
                      startIcon={<Mail />}
                    >
                      {formatMessage({
                        id: 'email.Settings.email.plugin.button.test-email',
                        defaultMessage: 'Send test email',
                      })}
                    </Button>
                  </Grid.Item>
                </Grid.Root>
              </Flex>
            </Flex>
          </form>
        )}
      </Layouts.Content>
    </Page.Main>
  );
};
