import React, { useEffect, useReducer, useRef, useState } from 'react';

import { ContentLayout, Flex, Main } from '@strapi/design-system';
import {
  Form,
  SettingsPageTitle,
  useFetchClient,
  useFocusWhenNavigate,
  useGuidedTour,
  useNotification,
  useOverlayBlocker,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory, useRouteMatch } from 'react-router-dom';

import { ApiTokenPermissionsContextProvider } from '../../../../../contexts/ApiTokenPermissions';
import { formatAPIErrors } from '../../../../../utils';
import { selectAdminPermissions } from '../../../../App/selectors';
import { API_TOKEN_TYPE } from '../../../components/Tokens/constants';
import FormHead from '../../../components/Tokens/FormHead';
import TokenBox from '../../../components/Tokens/TokenBox';

import FormApiTokenContainer from './components/FormApiTokenContainer';
import LoadingView from './components/LoadingView';
import Permissions from './components/Permissions';
import init from './init';
import reducer, { initialState } from './reducer';
import { schema } from './utils';

const MSG_ERROR_NAME_TAKEN = 'Name already taken';

const ApiTokenCreateView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const history = useHistory();
  const permissions = useSelector(selectAdminPermissions);
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
    allowedActions: { canCreate, canUpdate, canRegenerate },
  } = useRBAC(permissions.settings['api-tokens']);
  const [state, dispatch] = useReducer(reducer, initialState, (state) => init(state, {}));
  const {
    params: { id },
  } = useRouteMatch('/settings/api-tokens/:id');
  const { get, post, put } = useFetchClient();

  const isCreating = id === 'create';

  useQuery(
    'content-api-permissions',
    async () => {
      const [permissions, routes] = await Promise.all(
        ['/admin/content-api/permissions', '/admin/content-api/routes'].map(async (url) => {
          const { data } = await get(url);

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
    trackUsageRef.current(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: API_TOKEN_TYPE,
    });
  }, [isCreating]);

  const { status } = useQuery(
    ['api-token', id],
    async () => {
      const {
        data: { data },
      } = await get(`/admin/api-tokens/${id}`);

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
    trackUsageRef.current(isCreating ? 'willCreateToken' : 'willEditToken', {
      tokenType: API_TOKEN_TYPE,
    });
    lockApp();
    const lifespanVal =
      body.lifespan && parseInt(body.lifespan, 10) && body.lifespan !== '0'
        ? parseInt(body.lifespan, 10)
        : null;

    try {
      const {
        data: { data: response },
      } = isCreating
        ? await post(`/admin/api-tokens`, {
            ...body,
            lifespan: lifespanVal,
            permissions: body.type === 'custom' ? state.selectedActions : null,
          })
        : await put(`/admin/api-tokens/${id}`, {
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
              id: 'notification.success.apitokencreated',
              defaultMessage: 'API Token successfully created',
            })
          : formatMessage({
              id: 'notification.success.apitokenedited',
              defaultMessage: 'API Token successfully edited',
            }),
      });

      trackUsageRef.current(isCreating ? 'didCreateToken' : 'didEditToken', {
        type: apiToken.type,
        tokenType: API_TOKEN_TYPE,
      });
    } catch (err) {
      const errors = formatAPIErrors(err.response.data);
      actions.setErrors(errors);

      if (err?.response?.data?.error?.message === MSG_ERROR_NAME_TAKEN) {
        toggleNotification({
          type: 'warning',
          message: err.response.data.message || 'notification.error.tokennamenotunique',
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: err?.response?.data?.message || 'notification.error',
        });
      }
      unlockApp();
    }
  };

  const [hasChangedPermissions, setHasChangedPermissions] = useState(false);

  const handleChangeCheckbox = ({ target: { value } }) => {
    setHasChangedPermissions(true);
    dispatch({
      type: 'ON_CHANGE',
      value,
    });
  };

  const handleChangeSelectAllCheckbox = ({ target: { value } }) => {
    setHasChangedPermissions(true);
    dispatch({
      type: 'SELECT_ALL_IN_PERMISSION',
      value,
    });
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
            lifespan: apiToken?.lifespan ? apiToken.lifespan.toString() : apiToken?.lifespan,
          }}
          enableReinitialize
          onSubmit={(body, actions) => handleSubmit(body, actions)}
        >
          {({ errors, handleChange, isSubmitting, values, setFieldValue }) => {
            if (hasChangedPermissions && values?.type !== 'custom') {
              setFieldValue('type', 'custom');
            }

            return (
              <Form>
                <FormHead
                  backUrl="/settings/api-tokens"
                  title={{
                    id: 'Settings.apiTokens.createPage.title',
                    defaultMessage: 'Create API Token',
                  }}
                  token={apiToken}
                  setToken={setApiToken}
                  canEditInputs={canEditInputs}
                  canRegenerate={canRegenerate}
                  isSubmitting={isSubmitting}
                  regenerateUrl="/admin/api-tokens/"
                />

                <ContentLayout>
                  <Flex direction="column" alignItems="stretch" gap={6}>
                    {Boolean(apiToken?.name) && (
                      <TokenBox token={apiToken?.accessKey} tokenType={API_TOKEN_TYPE} />
                    )}
                    <FormApiTokenContainer
                      errors={errors}
                      onChange={handleChange}
                      canEditInputs={canEditInputs}
                      isCreating={isCreating}
                      values={values}
                      apiToken={apiToken}
                      onDispatch={dispatch}
                      setHasChangedPermissions={setHasChangedPermissions}
                    />
                    <Permissions
                      disabled={
                        !canEditInputs ||
                        values?.type === 'read-only' ||
                        values?.type === 'full-access'
                      }
                    />
                  </Flex>
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
