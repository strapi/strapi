import * as React from 'react';

import { Flex } from '@strapi/design-system';
import { Formik, Form, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';

import { useGuidedTour } from '../../../../../components/GuidedTour/Provider';
import { Layouts } from '../../../../../components/Layouts/Layout';
import { Page } from '../../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { useNotification } from '../../../../../features/Notifications';
import { useTracking } from '../../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../../hooks/useAPIErrorHandler';
import { useRBAC } from '../../../../../hooks/useRBAC';
import {
  useCreateAPITokenMutation,
  useGetAPITokenQuery,
  useUpdateAPITokenMutation,
} from '../../../../../services/apiTokens';
import { useGetPermissionsQuery, useGetRoutesQuery } from '../../../../../services/contentApi';
import { isBaseQueryError } from '../../../../../utils/baseQuery';
import { API_TOKEN_TYPE } from '../../../components/Tokens/constants';
import { FormHead } from '../../../components/Tokens/FormHead';
import { TokenBox } from '../../../components/Tokens/TokenBox';

import {
  ApiTokenPermissionsContextValue,
  ApiTokenPermissionsProvider,
} from './apiTokenPermissions';
import { FormApiTokenContainer } from './components/FormApiTokenContainer';
import { Permissions } from './components/Permissions';
import { schema } from './constants';
import { initialState, reducer } from './reducer';

import type { Get, ApiToken } from '../../../../../../../shared/contracts/api-token';

/**
 * TODO: this could definitely be refactored to avoid using redux and instead just use the
 * server response as the source of the truth for the data.
 */
export const EditView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { state: locationState } = useLocation();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const [apiToken, setApiToken] = React.useState<ApiToken | null>(
    locationState?.apiToken?.accessKey
      ? {
          ...locationState.apiToken,
        }
      : null
  );
  const { trackUsage } = useTracking();
  const setCurrentStep = useGuidedTour('EditView', (state) => state.setCurrentStep);
  const {
    allowedActions: { canCreate, canUpdate, canRegenerate },
  } = useRBAC(permissions.settings?.['api-tokens']);
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const match = useMatch('/settings/api-tokens/:id');
  const id = match?.params?.id;
  const isCreating = id === 'create';
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidtionErrors,
  } = useAPIErrorHandler();

  const navigate = useNavigate();

  const contentAPIPermissionsQuery = useGetPermissionsQuery();
  const contentAPIRoutesQuery = useGetRoutesQuery();

  /**
   * Separate effects otherwise we could end
   * up duplicating the same notification.
   */
  React.useEffect(() => {
    if (contentAPIPermissionsQuery.error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(contentAPIPermissionsQuery.error),
      });
    }
  }, [contentAPIPermissionsQuery.error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    if (contentAPIRoutesQuery.error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(contentAPIRoutesQuery.error),
      });
    }
  }, [contentAPIRoutesQuery.error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    if (contentAPIPermissionsQuery.data) {
      dispatch({
        type: 'UPDATE_PERMISSIONS_LAYOUT',
        value: contentAPIPermissionsQuery.data,
      });
    }
  }, [contentAPIPermissionsQuery.data]);

  React.useEffect(() => {
    if (contentAPIRoutesQuery.data) {
      dispatch({
        type: 'UPDATE_ROUTES',
        value: contentAPIRoutesQuery.data,
      });
    }
  }, [contentAPIRoutesQuery.data]);

  React.useEffect(() => {
    if (apiToken) {
      if (apiToken.type === 'read-only') {
        dispatch({
          type: 'ON_CHANGE_READ_ONLY',
        });
      }
      if (apiToken.type === 'full-access') {
        dispatch({
          type: 'SELECT_ALL_ACTIONS',
        });
      }
      if (apiToken.type === 'custom') {
        dispatch({
          type: 'UPDATE_PERMISSIONS',
          value: apiToken?.permissions,
        });
      }
    }
  }, [apiToken]);

  React.useEffect(() => {
    trackUsage(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: API_TOKEN_TYPE,
    });
  }, [isCreating, trackUsage]);

  const { data, error, isLoading } = useGetAPITokenQuery(id!, {
    skip: !id || isCreating || !!apiToken,
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    if (data) {
      setApiToken(data);

      if (data.type === 'read-only') {
        dispatch({
          type: 'ON_CHANGE_READ_ONLY',
        });
      }
      if (data.type === 'full-access') {
        dispatch({
          type: 'SELECT_ALL_ACTIONS',
        });
      }
      if (data.type === 'custom') {
        dispatch({
          type: 'UPDATE_PERMISSIONS',
          value: data?.permissions,
        });
      }
    }
  }, [data]);

  const [createToken] = useCreateAPITokenMutation();
  const [updateToken] = useUpdateAPITokenMutation();

  interface FormValues extends Pick<Get.Response['data'], 'name' | 'description'> {
    lifespan: Get.Response['data']['lifespan'] | undefined;
    type: Get.Response['data']['type'] | undefined;
  }

  const handleSubmit = async (body: FormValues, formik: FormikHelpers<FormValues>) => {
    trackUsage(isCreating ? 'willCreateToken' : 'willEditToken', {
      tokenType: API_TOKEN_TYPE,
    });

    try {
      if (isCreating) {
        const res = await createToken({
          ...body,
          // lifespan must be "null" for unlimited (0 would mean instantly expired and isn't accepted)
          lifespan:
            body?.lifespan && body.lifespan !== '0' ? parseInt(body.lifespan.toString(), 10) : null,
          permissions: body.type === 'custom' ? state.selectedActions : null,
        });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            formik.setErrors(formatValidtionErrors(res.error));
          } else {
            toggleNotification({
              type: 'danger',
              message: formatAPIError(res.error),
            });
          }

          return;
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'notification.success.apitokencreated',
            defaultMessage: 'API Token successfully created',
          }),
        });

        trackUsage('didCreateToken', {
          type: res.data.type,
          tokenType: API_TOKEN_TYPE,
        });

        navigate(`../api-tokens/${res.data.id.toString()}`, {
          state: { apiToken: res.data },
          replace: true,
        });
        setCurrentStep('apiTokens.success');
      } else {
        const res = await updateToken({
          id: id!,
          name: body.name,
          description: body.description,
          type: body.type,
          permissions: body.type === 'custom' ? state.selectedActions : null,
        });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            formik.setErrors(formatValidtionErrors(res.error));
          } else {
            toggleNotification({
              type: 'danger',
              message: formatAPIError(res.error),
            });
          }

          return;
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'notification.success.apitokenedited',
            defaultMessage: 'API Token successfully edited',
          }),
        });

        trackUsage('didEditToken', {
          type: res.data.type,
          tokenType: API_TOKEN_TYPE,
        });
      }
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'Something went wrong',
        }),
      });
    }
  };

  const [hasChangedPermissions, setHasChangedPermissions] = React.useState(false);

  const handleChangeCheckbox = ({
    target: { value },
  }: Parameters<ApiTokenPermissionsContextValue['value']['onChange']>[0]) => {
    setHasChangedPermissions(true);
    dispatch({
      type: 'ON_CHANGE',
      value,
    });
  };

  const handleChangeSelectAllCheckbox = ({
    target: { value },
  }: Parameters<ApiTokenPermissionsContextValue['value']['onChangeSelectAll']>[0]) => {
    setHasChangedPermissions(true);
    dispatch({
      type: 'SELECT_ALL_IN_PERMISSION',
      value,
    });
  };

  const setSelectedAction = ({
    target: { value },
  }: Parameters<ApiTokenPermissionsContextValue['value']['setSelectedAction']>[0]) => {
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

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <ApiTokenPermissionsProvider value={providerValue}>
      <Page.Main>
        <Page.Title>
          {formatMessage(
            { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
            { name: 'API Tokens' }
          )}
        </Page.Title>
        <Formik
          validationSchema={schema}
          validateOnChange={false}
          initialValues={{
            name: apiToken?.name || '',
            description: apiToken?.description || '',
            type: apiToken?.type,
            lifespan: apiToken?.lifespan,
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

                <Layouts.Content>
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
                </Layouts.Content>
              </Form>
            );
          }}
        </Formik>
      </Page.Main>
    </ApiTokenPermissionsProvider>
  );
};

export const ProtectedEditView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['api-tokens'].read
  );

  return (
    <Page.Protect permissions={permissions}>
      <EditView />
    </Page.Protect>
  );
};
