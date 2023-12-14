import * as React from 'react';

import { ContentLayout, Flex, Main } from '@strapi/design-system';
import {
  CheckPagePermissions,
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
import { AxiosError, AxiosResponse } from 'axios';
import { Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useLocation, useHistory, useRouteMatch } from 'react-router-dom';

import { selectAdminPermissions } from '../../../../../selectors';
import { formatAPIErrors } from '../../../../../utils/formatAPIErrors';
import { API_TOKEN_TYPE } from '../../../components/Tokens/constants';
import { FormHead } from '../../../components/Tokens/FormHead';
import { TokenBox } from '../../../components/Tokens/TokenBox';

import {
  ApiTokenPermissionsContextValue,
  ApiTokenPermissionsProvider,
} from './apiTokenPermissions';
import { FormApiTokenContainer } from './components/FormApiTokenContainer';
import { LoadingView } from './components/LoadingView';
import { Permissions } from './components/Permissions';
import { schema } from './constants';
import { initialState, reducer } from './reducer';

import type {
  Get,
  Update,
  Create,
  ApiToken,
} from '../../../../../../../shared/contracts/api-token';
import type { List as ListContentApiPermissions } from '../../../../../../../shared/contracts/content-api/permissions';
import type { List as ListContentApiRoutes } from '../../../../../../../shared/contracts/content-api/routes';

const MSG_ERROR_NAME_TAKEN = 'Name already taken';

export const EditView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const { state: locationState } = useLocation<{ apiToken: ApiToken }>();
  const permissions = useSelector(selectAdminPermissions);
  const [apiToken, setApiToken] = React.useState<ApiToken | null>(
    locationState?.apiToken?.accessKey
      ? {
          ...locationState.apiToken,
        }
      : null
  );
  const { trackUsage } = useTracking();
  const { setCurrentStep } = useGuidedTour();
  const {
    allowedActions: { canCreate, canUpdate, canRegenerate },
  } = useRBAC(permissions.settings?.['api-tokens']);
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const match = useRouteMatch<{ id: string }>('/settings/api-tokens/:id');
  const id = match?.params?.id;
  const { get, post, put } = useFetchClient();
  const history = useHistory();

  const isCreating = id === 'create';

  useQuery(
    'content-api-permissions',
    async () => {
      await Promise.all(
        ['/admin/content-api/permissions', '/admin/content-api/routes'].map(async (url) => {
          if (url === '/admin/content-api/permissions') {
            const {
              data: { data },
            } = await get<ListContentApiPermissions.Response>(url);

            dispatch({
              type: 'UPDATE_PERMISSIONS_LAYOUT',
              value: data,
            });

            return data;
          } else if (url === '/admin/content-api/routes') {
            const {
              data: { data },
            } = await get<ListContentApiRoutes.Response>(url);

            dispatch({
              type: 'UPDATE_ROUTES',
              value: data,
            });

            return data;
          }
        })
      );

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

  React.useEffect(() => {
    trackUsage(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: API_TOKEN_TYPE,
    });
  }, [isCreating, trackUsage]);

  const { status } = useQuery(
    ['api-token', id],
    async () => {
      const {
        data: { data },
      } = await get<Get.Response>(`/admin/api-tokens/${id}`);

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

  const handleSubmit = async (
    body: Pick<Get.Response['data'], 'name' | 'description'> & {
      lifespan: Get.Response['data']['lifespan'] | undefined;
      type: Get.Response['data']['type'] | undefined;
    },
    actions: FormikHelpers<
      Pick<Get.Response['data'], 'name' | 'description'> & {
        lifespan: Get.Response['data']['lifespan'] | undefined;
        type: Get.Response['data']['type'] | undefined;
      }
    >
  ) => {
    trackUsage(isCreating ? 'willCreateToken' : 'willEditToken', {
      tokenType: API_TOKEN_TYPE,
    });

    // @ts-expect-error context assertation
    lockApp();

    try {
      const {
        data: { data: response },
      } = isCreating
        ? await post<Create.Response, AxiosResponse<Create.Response>, Create.Request['body']>(
            `/admin/api-tokens`,
            {
              ...body,
              // in case a token has a lifespan of "unlimited" the API only accepts zero as a number
              lifespan: body.lifespan === '0' ? parseInt(body.lifespan) : null,
              permissions: body.type === 'custom' ? state.selectedActions : null,
            }
          )
        : await put<Update.Response, AxiosResponse<Update.Response>, Update.Request['body']>(
            `/admin/api-tokens/${id}`,
            {
              name: body.name,
              description: body.description,
              type: body.type,
              permissions: body.type === 'custom' ? state.selectedActions : null,
            }
          );

      if (isCreating) {
        history.replace(`/settings/api-tokens/${response.id}`, { apiToken: response });
        setCurrentStep('apiTokens.success');
      }

      // @ts-expect-error context assertation
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

      if (apiToken?.type) {
        trackUsage(isCreating ? 'didCreateToken' : 'didEditToken', {
          type: apiToken.type,
          tokenType: API_TOKEN_TYPE,
        });
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
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
      }

      // @ts-expect-error context assertation
      unlockApp();
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
  const isLoading = !isCreating && !apiToken && status !== 'success';

  if (isLoading) {
    // @ts-expect-error this is probably fine for now
    return <LoadingView apiTokenName={apiToken?.name} />;
  }

  return (
    <ApiTokenPermissionsProvider value={providerValue}>
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
    </ApiTokenPermissionsProvider>
  );
};

export const ProtectedEditView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.['api-tokens'].read}>
      <EditView />
    </CheckPagePermissions>
  );
};
