import React, { useEffect, useRef, useReducer, useMemo } from 'react';
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
import adminPermissions from '../../../../../permissions';
import { ApiTokenPermissionsContextProvider } from '../../../../../contexts/ApiTokenPermissions';
import init from './init';
import reducer, { initialState } from './reducer';

const ApiTokenCreateView = () => {
  let apiToken;
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const history = useHistory();
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
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/content-api/permissions`);
      dispatch({
        type: 'UPDATE_PERMISSIONS_LAYOUT',
        value: data || [],
      });

      return data;
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

  if (history.location.state?.apiToken.accessKey) {
    apiToken = history.location.state.apiToken;
  }

  const { status, data } = useQuery(
    ['api-token', id],
    async () => {
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/api-tokens/${id}`);

      dispatch({
        type: 'UPDATE_PERMISSIONS',
        value: data?.permissions,
      });

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

  if (data) {
    apiToken = data;
  }

  const handleSubmit = async (body, actions) => {
    trackUsageRef.current(isCreating ? 'willCreateToken' : 'willEditToken');
    lockApp();

    try {
      const {
        data: { data: response },
      } = isCreating
        ? await axiosInstance.post(`/admin/api-tokens`, {
            ...body,
            permissions: body.type === 'custom' ? state.data.selectedActions : null,
          })
        : await axiosInstance.put(`/admin/api-tokens/${id}`, {
            name: body.name,
            description: body.description,
            type: body.type,
            permissions: body.type === 'custom' ? state.data.selectedActions : null,
          });

      apiToken = response;

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

      if (isCreating) {
        history.replace(`/settings/api-tokens/${response.id}`, { apiToken: response });
        setCurrentStep('apiTokens.success');
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

  const hasAllActionsSelected = useMemo(() => {
    const { data, selectedActions } = state;

    const areAllActionsSelected = data.allActionsIds.every((actionId) =>
      selectedActions.includes(actionId)
    );

    return areAllActionsSelected;
  }, [state]);

  const hasAllActionsNotSelected = useMemo(() => {
    const { selectedActions } = state;

    const areAllActionsNotSelected = selectedActions.length === 0;

    return areAllActionsNotSelected;
  }, [state]);

  const hasReadOnlyActionsSelected = useMemo(() => {
    const { data, selectedActions } = state;

    const areAllActionsReadOnly = data.allActionsIds.every((actionId) => {
      if (actionId.includes('find') || actionId.includes('findOne')) {
        return selectedActions.includes(actionId);
      }

      return !selectedActions.includes(actionId);
    });

    return areAllActionsReadOnly;
  }, [state]);

  const tokenTypeValue = useMemo(() => {
    if (hasAllActionsSelected && !hasReadOnlyActionsSelected) return 'full-access';

    if (hasReadOnlyActionsSelected) return 'read-only';

    if (hasAllActionsNotSelected) return null;

    return 'custom';
  }, [hasAllActionsSelected, hasReadOnlyActionsSelected, hasAllActionsNotSelected]);

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
            type: apiToken?.type,
            lifespan: apiToken?.lifespan,
          }}
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
                    canEditInputs && (
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
                              <Option value={7}>
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.7-days',
                                  defaultMessage: '7 days',
                                })}
                              </Option>
                              <Option value={30}>
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.30-days',
                                  defaultMessage: '30 days',
                                })}
                              </Option>
                              <Option value={90}>
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
                              value={tokenTypeValue}
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
                    <Permissions disabled={!canEditInputs} />
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
