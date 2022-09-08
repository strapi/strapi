import React, { useEffect, useState, useRef, useReducer } from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  useFocusWhenNavigate,
  Form,
  useOverlayBlocker,
  useNotification,
  useTracking,
  useGuidedTour,
  Link,
  usePersistentState,
  useRBAC,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Button } from '@strapi/design-system/Button';
import Check from '@strapi/icons/Check';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import { Formik } from 'formik';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { TextInput } from '@strapi/design-system/TextInput';
import { Textarea } from '@strapi/design-system/Textarea';
import { Select, Option } from '@strapi/design-system/Select';
import { get } from 'lodash';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useQuery } from 'react-query';
import { formatAPIErrors } from '../../../../../utils';
import { axiosInstance } from '../../../../../core/utils';
import { getDateOfExpiration, schema } from './utils';
import LoadingView from './components/LoadingView';
import HeaderContentBox from './components/ContentBox';
import Permissions from './components/Permissions';
import Regenerate from './components/Regenerate';
import adminPermissions from '../../../../../permissions';
import { ApiTokenPermissionsContextProvider } from '../../../../../contexts/ApiTokenPermissions';
import init from './init';
import reducer, { initialState } from './reducer';

const MSG_ERROR_NAME_TAKEN = 'Name already taken';

const ApiTokenCreateView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const history = useHistory();
  const [apiToken, setApiToken] = useState(
    history.location.state?.apiToken.accessKey
      ? {
          ...history.location.state.apiToken,
        }
      : null
  );
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);
  const { setCurrentStep } = useGuidedTour();
  const {
    allowedActions: { canCreate, canUpdate },
  } = useRBAC(adminPermissions.settings['api-tokens']);
  const [lang] = usePersistentState('strapi-admin-language', 'en');
  const [state, dispatch] = useReducer(reducer, initialState, (state) => init(state, {}));
  const {
    params: { id },
  } = useRouteMatch('/settings/api-tokens/:id');

  const isCreating = id === 'create';

  useQuery(
    'content-api-permissions',
    async () => {
      const [permissions, routes] = await Promise.all(
        ['/admin/content-api/permissions', '/admin/content-api/routes'].map(async (url) => {
          const { data } = await axiosInstance.get(url);

          return data.data;
        })
      );

      dispatch({
        type: 'UPDATE_PERMISSIONS_LAYOUT',
        value: permissions,
      });

      dispatch({
        type: 'UPDATE_ROUTES',
        value: routes,
      });

      if (apiToken) {
        if (apiToken?.type === 'read-only') {
          dispatch({
            type: 'ON_CHANGE_READ_ONLY',
          });
        }
        if (apiToken?.type === 'full-access') {
          dispatch({
            type: 'SELECT_ALL_ACTIONS',
          });
        }
        if (apiToken?.type === 'custom') {
          dispatch({
            type: 'UPDATE_PERMISSIONS',
            value: apiToken?.permissions,
          });
        }
      }
    },
    {
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  useEffect(() => {
    trackUsageRef.current(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList');
  }, [isCreating]);

  const { status } = useQuery(
    ['api-token', id],
    async () => {
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/api-tokens/${id}`);

      setApiToken({
        ...data,
      });

      if (data?.type === 'read-only') {
        dispatch({
          type: 'ON_CHANGE_READ_ONLY',
        });
      }
      if (data?.type === 'full-access') {
        dispatch({
          type: 'SELECT_ALL_ACTIONS',
        });
      }
      if (data?.type === 'custom') {
        dispatch({
          type: 'UPDATE_PERMISSIONS',
          value: data?.permissions,
        });
      }

      return data;
    },
    {
      enabled: !isCreating && !apiToken,
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const handleSubmit = async (body, actions) => {
    trackUsageRef.current(isCreating ? 'willCreateToken' : 'willEditToken');
    lockApp();

    try {
      const {
        data: { data: response },
      } = isCreating
        ? await axiosInstance.post(`/admin/api-tokens`, {
            ...body,
            permissions: body.type === 'custom' ? state.selectedActions : null,
          })
        : await axiosInstance.put(`/admin/api-tokens/${id}`, {
            name: body.name,
            description: body.description,
            type: body.type,
            permissions: body.type === 'custom' ? state.selectedActions : null,
          });

      if (isCreating) {
        history.replace(`/settings/api-tokens/${response.id}`, { apiToken: response });
        setCurrentStep('apiTokens.success');
      }
      unlockApp();
      setApiToken({
        ...response,
      });

      toggleNotification({
        type: 'success',
        message: isCreating
          ? formatMessage({
              id: 'notification.success.tokencreated',
              defaultMessage: 'API Token successfully created',
            })
          : formatMessage({
              id: 'notification.success.tokenedited',
              defaultMessage: 'API Token successfully edited',
            }),
      });

      trackUsageRef.current(isCreating ? 'didCreateToken' : 'didEditToken', {
        type: apiToken.type,
      });
    } catch (err) {
      const errors = formatAPIErrors(err.response.data);
      actions.setErrors(errors);

      if (err?.response?.data?.error?.message === MSG_ERROR_NAME_TAKEN) {
        toggleNotification({
          type: 'warning',
          message: get(err, 'response.data.message', 'notification.error.tokennamenotunique'),
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: get(err, 'response.data.message', 'notification.error'),
        });
      }
      unlockApp();
    }
  };

  const handleChangeCheckbox = ({ target: { value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      value,
    });
  };

  const handleChangeSelectAllCheckbox = ({ target: { value } }) => {
    value.forEach((action) => {
      dispatch({
        type: 'ON_CHANGE',
        value: action.actionId,
      });
    });
  };

  const handleChangeSelectApiTokenType = ({ target: { value } }) => {
    if (value === 'full-access') {
      dispatch({
        type: 'SELECT_ALL_ACTIONS',
      });
    }
    if (value === 'read-only') {
      dispatch({
        type: 'ON_CHANGE_READ_ONLY',
      });
    }
  };

  const setSelectedAction = ({ target: { value } }) => {
    dispatch({
      type: 'SET_SELECTED_ACTION',
      value,
    });
  };

  const handleRegenerate = (newKey) => {
    setApiToken({
      ...apiToken,
      accessKey: newKey,
    });
  };

  const providerValue = {
    ...state,
    onChange: handleChangeCheckbox,
    onChangeSelectAll: handleChangeSelectAllCheckbox,
    setSelectedAction,
  };

  const canEditInputs = (canUpdate && !isCreating) || (canCreate && isCreating);
  const isLoading = !isCreating && !apiToken && status !== 'success';

  if (isLoading) {
    return <LoadingView apiTokenName={apiToken?.name} />;
  }

  return (
    <ApiTokenPermissionsContextProvider value={providerValue}>
      <Main>
        <SettingsPageTitle name="API Tokens" />
        <Formik
          validationSchema={schema}
          validateOnChange={false}
          initialValues={{
            name: apiToken?.name || '',
            description: apiToken?.description || '',
            type: state.selectedActions.length > 0 && !apiToken?.type ? 'custom' : apiToken?.type,
            lifespan: apiToken?.lifespan,
          }}
          enableReinitialize
          onSubmit={(body, actions) => handleSubmit(body, actions)}
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
                    canEditInputs && (
                      <Stack horizontal spacing={2}>
                        {apiToken?.name && (
                          <Regenerate
                            onRegenerate={handleRegenerate}
                            idToRegenerate={apiToken?.id}
                          />
                        )}
                        <Button
                          disabled={isSubmitting}
                          loading={isSubmitting}
                          startIcon={<Check />}
                          type="submit"
                          size="S"
                        >
                          {formatMessage({
                            id: 'global.save',
                            defaultMessage: 'Save',
                          })}
                        </Button>
                      </Stack>
                    )
                  }
                  navigationAction={
                    <Link startIcon={<ArrowLeft />} to="/settings/api-tokens">
                      {formatMessage({
                        id: 'global.back',
                        defaultMessage: 'Back',
                      })}
                    </Link>
                  }
                />
                <ContentLayout>
                  <Stack spacing={6}>
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
                      <Stack spacing={4}>
                        <Typography variant="delta" as="h2">
                          {formatMessage({
                            id: 'global.details',
                            defaultMessage: 'Details',
                          })}
                        </Typography>
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
                              disabled={!canEditInputs}
                              required
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
                              disabled={!canEditInputs}
                            >
                              {values.description}
                            </Textarea>
                          </GridItem>
                          <GridItem key="lifespan" col={6} xs={12}>
                            <Select
                              name="lifespan"
                              label={formatMessage({
                                id: 'Settings.apiTokens.form.duration',
                                defaultMessage: 'Token duration',
                              })}
                              value={values.lifespan}
                              error={
                                errors.lifespan
                                  ? formatMessage(
                                      errors.lifespan?.id
                                        ? errors.lifespan
                                        : { id: errors.lifespan, defaultMessage: errors.lifespan }
                                    )
                                  : null
                              }
                              onChange={(value) => {
                                handleChange({ target: { name: 'lifespan', value } });
                              }}
                              required
                              disabled={!isCreating}
                              placeholder="Select"
                            >
                              <Option value={604800000}>
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.7-days',
                                  defaultMessage: '7 days',
                                })}
                              </Option>
                              <Option value={2592000000}>
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.30-days',
                                  defaultMessage: '30 days',
                                })}
                              </Option>
                              <Option value={2592000000}>
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.90-days',
                                  defaultMessage: '90 days',
                                })}
                              </Option>
                              <Option value={null}>
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.unlimited',
                                  defaultMessage: 'Unlimited',
                                })}
                              </Option>
                            </Select>
                            <Typography variant="pi" textColor="neutral600">
                              {!isCreating &&
                                `${formatMessage({
                                  id: 'Settings.apiTokens.duration.expiration-date',
                                  defaultMessage: 'Expiration date',
                                })}: ${getDateOfExpiration(
                                  apiToken?.createdAt,
                                  values.lifespan,
                                  lang
                                )}`}
                            </Typography>
                          </GridItem>

                          <GridItem key="type" col={6} xs={12}>
                            <Select
                              name="type"
                              label={formatMessage({
                                id: 'Settings.apiTokens.form.type',
                                defaultMessage: 'Token type',
                              })}
                              value={values?.type}
                              error={
                                errors.type
                                  ? formatMessage(
                                      errors.type?.id
                                        ? errors.type
                                        : { id: errors.type, defaultMessage: errors.type }
                                    )
                                  : null
                              }
                              onChange={(value) => {
                                handleChangeSelectApiTokenType({ target: { value } });
                                handleChange({ target: { name: 'type', value } });
                              }}
                              placeholder="Select"
                              required
                              disabled={!canEditInputs}
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
                              <Option value="custom">
                                {formatMessage({
                                  id: 'Settings.apiTokens.types.custom',
                                  defaultMessage: 'Custom',
                                })}
                              </Option>
                            </Select>
                          </GridItem>
                        </Grid>
                      </Stack>
                    </Box>
                    <Permissions
                      disabled={
                        !canEditInputs ||
                        values?.type === 'read-only' ||
                        values?.type === 'full-access'
                      }
                    />
                  </Stack>
                </ContentLayout>
              </Form>
            );
          }}
        </Formik>
      </Main>
    </ApiTokenPermissionsContextProvider>
  );
};

export default ApiTokenCreateView;
