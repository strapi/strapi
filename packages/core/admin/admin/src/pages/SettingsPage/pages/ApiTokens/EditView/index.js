import React from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  useFocusWhenNavigate,
  Form,
  useOverlayBlocker,
  useNotification,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Button } from '@strapi/design-system/Button';
import CheckIcon from '@strapi/icons/CheckIcon';
import BackIcon from '@strapi/icons/BackIcon';
import { Link } from '@strapi/design-system/Link';
import { Formik } from 'formik';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { H3 } from '@strapi/design-system/Text';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { TextInput } from '@strapi/design-system/TextInput';
import { Textarea } from '@strapi/design-system/Textarea';
import { Select, Option } from '@strapi/design-system/Select';
import get from 'lodash/get';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useQuery } from 'react-query';
import { formatAPIErrors } from '../../../../../utils';
import { axiosInstance } from '../../../../../core/utils';
import schema from './utils/schema';
import LoadingView from './components/LoadingView';
import HeaderContentBox from './components/ContentBox';

const ApiTokenCreateView = () => {
  let apiToken;
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const history = useHistory();

  const {
    params: { id },
  } = useRouteMatch('/settings/api-tokens/:id');

  const isCreating = id === 'create';

  if (history.location.state?.apiToken.accessKey) {
    apiToken = history.location.state.apiToken;
  }

  const { status, data } = useQuery(
    ['api-token', id],
    async () => {
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/api-tokens/${id}`);

      return data;
    },
    {
      enabled: !isCreating && !apiToken,
      onError: () => {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  if (data) {
    apiToken = data;
  }

  const handleSubmit = async (body, actions) => {
    lockApp();

    try {
      const {
        data: { data: response },
      } = isCreating
        ? await axiosInstance.post(`/admin/api-tokens`, body)
        : await axiosInstance.put(`/admin/api-tokens/${id}`, body);

      apiToken = response;

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
      });

      if (isCreating) {
        history.replace(`/settings/api-tokens/${response.id}`, { apiToken: response });
      }
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

  const isLoading = !isCreating && !apiToken && status !== 'success';

  if (isLoading) {
    return <LoadingView apiTokenName={apiToken?.name} />;
  }

  return (
    <Main>
      <SettingsPageTitle name="API Tokens" />
      <Formik
        validationSchema={schema}
        validateOnChange={false}
        initialValues={
          apiToken || {
            name: '',
            description: '',
            type: 'read-only',
          }
        }
        onSubmit={handleSubmit}
      >
        {({ errors, handleChange, isSubmitting, values }) => {
          return (
            <Form>
              <HeaderLayout
                title={
                  apiToken?.name ||
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
                  {Boolean(apiToken?.name) && <HeaderContentBox apiToken={apiToken.accessKey} />}
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
