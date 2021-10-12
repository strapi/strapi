import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  useFocusWhenNavigate,
  Form,
  useOverlayBlocker,
  useNotification,
  ContentBox,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Button } from '@strapi/parts/Button';
import CheckIcon from '@strapi/icons/CheckIcon';
import BackIcon from '@strapi/icons/BackIcon';
import { Link } from '@strapi/parts/Link';
import { Formik } from 'formik';
import { Stack } from '@strapi/parts/Stack';
import { Box } from '@strapi/parts/Box';
import { H3 } from '@strapi/parts/Text';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { TextInput } from '@strapi/parts/TextInput';
import { Textarea } from '@strapi/parts/Textarea';
import { Select, Option } from '@strapi/parts/Select';
import get from 'lodash/get';
import { IconButton } from '@strapi/parts/IconButton';
import Duplicate from '@strapi/icons/Duplicate';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';
import { formatAPIErrors } from '../../../../../utils';
import { axiosInstance } from '../../../../../core/utils';
import schema from './utils/schema';

const ApiTokenCreateView = () => {
  const [apiToken, setApiToken] = useState({});
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();

  const {
    params: { id },
  } = useRouteMatch('/settings/api-tokens/:id');

  const { status } = useQuery(
    ['api-tokens', id],
    async () => {
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/api-tokens/${id}`);

      setApiToken(() => ({
        accessKey: formatMessage({
          id: 'Settings.apiTokens.copy.editTitle',
          defaultMessage: 'This token isn’t accessible anymore.',
        }),
        ...data,
      }));

      return data;
    },
    {
      enabled: id !== 'create',
      onError: () => {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const handleSubmit = async (body, actions) => {
    lockApp();

    try {
      const {
        data: { data: response },
      } =
        id === 'create'
          ? await axiosInstance.post(`/admin/api-tokens`, body)
          : await axiosInstance.put(`/admin/api-tokens/${id}`, body);

      setApiToken(() => ({
        accessKey: formatMessage({
          id: 'Settings.apiTokens.copy.editTitle',
          defaultMessage: 'This token isn’t accessible anymore.',
        }),
        ...response,
      }));

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
      });
    } catch (err) {
      const errors = formatAPIErrors(err.response.data);
      actions.setErrors(errors);

      toggleNotification({
        type: 'warning',
        message: get(err, 'response.data.message', 'notification.error'),
      });
    }

    unlockApp();
  };

  const isLoading = status !== 'success';

  if (isLoading) {
    return (
      <Main aria-busy="true">
        <SettingsPageTitle name="API Tokens" />
        <HeaderLayout
          primaryAction={
            <Button disabled startIcon={<CheckIcon />} type="button" size="L">
              {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
            </Button>
          }
          title={
            apiToken.name ||
            formatMessage({
              id: 'Settings.apiTokens.createPage.title',
              defaultMessage: 'Create API Token',
            })
          }
        />
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
  }

  return (
    <Main>
      <SettingsPageTitle name="API Tokens" />
      <Formik
        validationSchema={schema}
        validateOnChange={false}
        initialValues={{
          name: apiToken.name || '',
          description: apiToken.description || '',
          type: apiToken.type || 'read-only',
        }}
        onSubmit={handleSubmit}
      >
        {({ errors, handleChange, isSubmitting, values }) => {
          return (
            <Form>
              <HeaderLayout
                title={
                  apiToken.name ||
                  formatMessage({
                    id: 'Settings.apiTokens.createPage.title',
                    defaultMessage: 'Create API Token',
                  })
                }
                primaryAction={
                  <Button
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    startIcon={<CheckIcon />}
                    type="submit"
                    size="L"
                  >
                    {formatMessage({
                      id: 'app.components.Button.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                }
                navigationAction={
                  <Link startIcon={<BackIcon />} to="/settings/api-tokens">
                    {formatMessage({
                      id: 'app.components.go-back',
                      defaultMessage: 'Go back',
                    })}
                  </Link>
                }
              />
              <ContentLayout>
                <Stack size={6}>
                  {Boolean(accessToken) && (
                    <ContentBox
                      endAction={
                        <CopyToClipboard
                          onCopy={() => {
                            toggleNotification({
                              type: 'success',
                              message: { id: 'Settings.apiTokens.notification.copied' },
                            });
                          }}
                          text={accessToken}
                        >
                          <IconButton
                            label={formatMessage({
                              id: 'app.component.CopyToClipboard.label',
                              default: 'Copy to clipboard',
                            })}
                            noBorder
                            icon={<Duplicate />}
                          />
                        </CopyToClipboard>
                      }
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg">
                          <text
                            transform="translate(-23 -9)"
                            fill="#4B515A"
                            fillRule="evenodd"
                            fontSize="32"
                            fontFamily="AppleColorEmoji, Apple Color Emoji"
                          >
                            <tspan x="23" y="36">
                              🔑
                            </tspan>
                          </text>
                        </svg>
                      }
                      iconBackground="neutral100"
                    />
                  )}
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Stack size={4}>
                      <H3 as="h2">
                        {formatMessage({
                          id: 'app.components.Users.ModalCreateBody.block-title.details',
                          defaultMessage: 'Details',
                        })}
                      </H3>
                      <Grid gap={5}>
                        <GridItem key="name" col={6} xs={12}>
                          <TextInput
                            name="name"
                            error={
                              errors.name
                                ? formatMessage(
                                    errors.name?.id
                                      ? errors.name
                                      : { id: errors.name, defaultMessage: errors.name }
                                  )
                                : null
                            }
                            label={formatMessage({
                              id: 'Settings.apiTokens.form.name',
                              defaultMessage: 'Name',
                            })}
                            onChange={handleChange}
                            value={values.name}
                          />
                        </GridItem>
                        <GridItem key="description" col={6} xs={12}>
                          <Textarea
                            label={formatMessage({
                              id: 'Settings.apiTokens.form.description',
                              defaultMessage: 'Description',
                            })}
                            name="description"
                            error={
                              errors.description
                                ? formatMessage(
                                    errors.description?.id
                                      ? errors.description
                                      : {
                                          id: errors.description,
                                          defaultMessage: errors.description,
                                        }
                                  )
                                : null
                            }
                            onChange={handleChange}
                          >
                            {values.description}
                          </Textarea>
                        </GridItem>
                        <GridItem key="type" col={6} xs={12}>
                          <Select
                            name="type"
                            label={formatMessage({
                              id: 'Settings.apiTokens.form.type',
                              defaultMessage: 'Token type',
                            })}
                            value={values.type}
                            error={
                              errors.type
                                ? formatMessage(
                                    errors.type?.id
                                      ? errors.type
                                      : { id: errors.type, defaultMessage: errors.type }
                                  )
                                : null
                            }
                            onChange={value => {
                              handleChange({ target: { name: 'type', value } });
                            }}
                          >
                            <Option value="read-only">
                              {formatMessage({
                                id: 'Settings.apiTokens.types.read-only',
                                defaultMessage: 'Read-only',
                              })}
                            </Option>
                            <Option value="full-access">
                              {formatMessage({
                                id: 'Settings.apiTokens.types.full-access',
                                defaultMessage: 'Full access',
                              })}
                            </Option>
                          </Select>
                        </GridItem>
                      </Grid>
                    </Stack>
                  </Box>
                </Stack>
              </ContentLayout>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

export default ApiTokenCreateView;
