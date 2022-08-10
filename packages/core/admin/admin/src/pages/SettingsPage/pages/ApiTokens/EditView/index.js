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
import { getDateOfExpiration, schema, getActionsState } from './utils';
import LoadingView from './components/LoadingView';
import HeaderContentBox from './components/ContentBox';
import Permissions from './components/Permissions';
import adminPermissions from '../../../../../permissions';
import { ApiTokenPermissionsContextProvider } from '../../../../../contexts/ApiTokenPermissions';
import { data as permissions } from './utils/tests/dataMock';
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
  const [state, dispatch] = useReducer(reducer, initialState, state => init(state, permissions));
  const [lang] = usePersistentState('strapi-admin-language', 'en');

  const {
    params: { id },
  } = useRouteMatch('/settings/api-tokens/:id');

  const isCreating = id === 'create';

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
    trackUsageRef.current(isCreating ? 'willCreateToken' : 'willEditToken');
    lockApp();

    try {
      const {
        data: { data: response },
      } = isCreating
        ? await axiosInstance.post(`/admin/api-tokens`, body)
        : await axiosInstance.put(`/admin/api-tokens/${id}`, {
            name: body.name,
            description: body.description,
            type: body.type,
          });

      apiToken = response;

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
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
    const {
      modifiedData: { collectionTypes, singleTypes, custom },
    } = state;

    const dataToCheck = { ...collectionTypes, ...singleTypes, ...custom };

    const areAllActionsSelected = getActionsState(dataToCheck, true);

    return areAllActionsSelected;
  }, [state]);

  const hasAllActionsNotSelected = useMemo(() => {
    const {
      modifiedData: { collectionTypes, singleTypes, custom },
    } = state;

    const dataToCheck = { ...collectionTypes, ...singleTypes, ...custom };

    const areAllActionsNotSelected = getActionsState(dataToCheck, false);

    return areAllActionsNotSelected;
  }, [state]);

  const hasReadOnlyActionsSelected = useMemo(() => {
    const {
      modifiedData: { collectionTypes, singleTypes, custom },
    } = state;

    const dataToCheck = { ...collectionTypes, ...singleTypes, ...custom };

    const areAllActionsReadOnly = getActionsState(dataToCheck, false, ['find', 'findOne']);

    return areAllActionsReadOnly;
  }, [state]);

  const tokenTypeValue = useMemo(() => {
    if (hasAllActionsSelected && !hasReadOnlyActionsSelected) return 'full-access';

    if (hasReadOnlyActionsSelected) return 'read-only';

    if (hasAllActionsNotSelected) return null;

    return 'custom';
  }, [hasAllActionsSelected, hasReadOnlyActionsSelected, hasAllActionsNotSelected]);

  const handleChangeCheckbox = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      name,
      value,
    });
  };

  const handleChangeSelectAllCheckbox = ({ target: { name, value } }) =>
    dispatch({
      type: 'ON_CHANGE_SELECT_ALL',
      keys: name.split('.'),
      value,
    });

  const handleChangeSelectApiTokenType = ({ target: { value } }) => {
    const { modifiedData } = state;

    if (value === 'full-access') {
      Object.keys(modifiedData).forEach(contentTypes => {
        Object.keys(modifiedData[contentTypes]).forEach(contentType => {
          dispatch({
            type: 'ON_CHANGE_SELECT_ALL',
            keys: [contentTypes, contentType],
            value: true,
          });
        });
      });
    }
    if (value === 'read-only') {
      Object.keys(modifiedData).forEach(contentTypes => {
        Object.keys(modifiedData[contentTypes]).forEach(contentType => {
          dispatch({
            type: 'ON_CHANGE_READ_ONLY',
            keys: [contentTypes, contentType],
            value: false,
          });
        });
      });
    }
  };

  const providerValue = {
    ...state,
    onChange: handleChangeCheckbox,
    onChangeSelectAll: handleChangeSelectAllCheckbox,
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
            duration: apiToken?.duration,
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
                        size="L"
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
                          <GridItem key="duration" col={6} xs={12}>
                            <Select
                              name="duration"
                              label={formatMessage({
                                id: 'Settings.apiTokens.form.duration',
                                defaultMessage: 'Token duration',
                              })}
                              value={isCreating ? values.duration : '7'}
                              error={
                                errors.duration
                                  ? formatMessage(
                                      errors.duration?.id
                                        ? errors.duration
                                        : { id: errors.duration, defaultMessage: errors.duration }
                                    )
                                  : null
                              }
                              onChange={value => {
                                handleChange({ target: { name: 'duration', value } });
                              }}
                              required
                              disabled={!isCreating}
                              placeholder="Select"
                            >
                              <Option value="7">
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.7-days',
                                  defaultMessage: '7 days',
                                })}
                              </Option>
                              <Option value="30">
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.30-days',
                                  defaultMessage: '30 days',
                                })}
                              </Option>
                              <Option value="90">
                                {formatMessage({
                                  id: 'Settings.apiTokens.duration.90-days',
                                  defaultMessage: '90 days',
                                })}
                              </Option>
                              <Option value="unlimited">
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
                                  values.duration || '7',
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
                              onChange={value => {
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
