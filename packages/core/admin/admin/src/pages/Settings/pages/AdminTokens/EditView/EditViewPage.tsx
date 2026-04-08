import * as React from 'react';

import { Flex, Box } from '@strapi/design-system';
import { Formik, Form, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';

import { Layouts } from '../../../../../components/Layouts/Layout';
import { Page } from '../../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { useAuth } from '../../../../../features/Auth';
import { useNotification } from '../../../../../features/Notifications';
import { useTracking } from '../../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../../hooks/useAPIErrorHandler';
import { useRBAC } from '../../../../../hooks/useRBAC';
import {
  useCreateAdminTokenMutation,
  useGetAdminTokenQuery,
  useUpdateAdminTokenMutation,
} from '../../../../../services/apiTokens';
import { isBaseQueryError } from '../../../../../utils/baseQuery';
import { API_TOKEN_TYPE, apiTokenInformationSchema } from '../../../components/Tokens/constants';
import { FormApiTokenContainer } from '../../../components/Tokens/FormApiTokenContainer';
import { FormHead } from '../../../components/Tokens/FormHead';
import { ApiTokenBox } from '../../../components/Tokens/TokenBox';

import { AdminPermissions } from './components/AdminPermissions';

import type { AdminApiToken, Get } from '../../../../../../../shared/contracts/admin-token';
import type { ApiToken } from '../../../../../../../shared/contracts/api-token';
import type { AuthContextValue } from '../../../../../features/Auth';
import type { PermissionsAPI } from '../../Roles/components/Permissions';
import type { Data } from '@strapi/types';

const getOwnerId = (owner: AdminApiToken['adminUserOwner']): Data.ID | null => {
  if (owner === undefined || owner === null) return null;
  return typeof owner === 'object' ? owner.id : owner;
};

const isCurrentUserTokenOwner = (
  apiToken: ApiToken | null,
  currentUserId: Data.ID | undefined
): boolean => {
  if (apiToken === null || apiToken.kind !== 'admin') return true;
  const ownerId = getOwnerId(apiToken.adminUserOwner);
  if (ownerId === null) return true;
  return currentUserId !== undefined && ownerId === currentUserId;
};

export const EditView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { state: locationState } = useLocation();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const [apiToken, setApiToken] = React.useState<ApiToken | null>(
    locationState?.apiToken?.accessKey !== undefined && locationState?.apiToken?.accessKey !== ''
      ? { ...locationState.apiToken }
      : null
  );

  const [showToken, setShowToken] = React.useState(
    locationState?.apiToken?.accessKey !== undefined && locationState?.apiToken?.accessKey !== ''
  );
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminPermissionsRef = React.useRef<PermissionsAPI>(null);
  const { trackUsage } = useTracking();
  const currentUser = useAuth('EditView', (state: AuthContextValue) => state.user);
  const {
    allowedActions: { canCreate, canUpdate, canRegenerate },
  } = useRBAC(permissions.settings?.['admin-tokens']);
  const match = useMatch('/settings/admin-tokens/:id');
  const id = match?.params?.id;
  const isCreating = id === 'create';
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  const navigate = useNavigate();

  React.useEffect(() => {
    trackUsage(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: API_TOKEN_TYPE,
    });
  }, [isCreating, trackUsage]);

  const { data, error, isLoading } = useGetAdminTokenQuery(id!, {
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
    }
  }, [data]);

  React.useEffect(() => {
    if (showToken) {
      hideTimerRef.current = setTimeout(() => {
        setShowToken(false);
      }, 30000); // 30 seconds

      return () => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
      };
    }
  }, [showToken]);

  const [createToken] = useCreateAdminTokenMutation();
  const [updateToken] = useUpdateAdminTokenMutation();

  interface FormValues extends Pick<Get.Response['data'], 'name' | 'description'> {
    lifespan: Get.Response['data']['lifespan'] | undefined;
    type: undefined;
  }

  const buildLifespan = (raw: FormValues['lifespan']): number | null =>
    raw && raw !== '0' ? parseInt(raw.toString(), 10) : null;

  const handleSubmit = async (body: FormValues, formik: FormikHelpers<FormValues>) => {
    trackUsage(isCreating ? 'willCreateToken' : 'willEditToken', {
      tokenType: API_TOKEN_TYPE,
    });

    const adminPermissionsToSend =
      adminPermissionsRef.current?.getPermissions().permissionsToSend ?? [];

    try {
      if (isCreating) {
        const res = await createToken({
          name: body.name,
          description: body.description,
          lifespan: buildLifespan(body.lifespan),
          adminPermissions: adminPermissionsToSend,
        });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            formik.setErrors(formatValidationErrors(res.error));
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
          kind: 'admin',
          tokenType: API_TOKEN_TYPE,
        });

        adminPermissionsRef.current?.setFormAfterSubmit();

        navigate(`../admin-tokens/${res.data.id.toString()}`, {
          state: { apiToken: res.data },
          replace: true,
        });
      } else {
        const res = await updateToken({
          id: id!,
          name: body.name,
          description: body.description,
          adminPermissions: adminPermissionsToSend,
        });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            formik.setErrors(formatValidationErrors(res.error));
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
          kind: 'admin',
          tokenType: API_TOKEN_TYPE,
        });

        adminPermissionsRef.current?.setFormAfterSubmit();
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

  const toggleToken = () => {
    setShowToken((prev) => !prev);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const canEditInputs = (canUpdate && !isCreating) || (canCreate && isCreating);
  const canShowToken = apiToken?.accessKey !== undefined && apiToken.accessKey !== '';
  const canRegenerateToken = canRegenerate && isCurrentUserTokenOwner(apiToken, currentUser?.id);

  const initialAdminPermissions =
    apiToken !== null && apiToken.kind === 'admin' ? (apiToken.adminPermissions ?? []) : [];

  const ownerUserId =
    apiToken !== null && apiToken.kind === 'admin' ? getOwnerId(apiToken.adminUserOwner) : null;

  if (isLoading || (!isCreating && apiToken === null)) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'Admin Tokens' }
        )}
      </Page.Title>
      <Formik
        validationSchema={apiTokenInformationSchema}
        validateOnChange={false}
        initialValues={{
          name: apiToken?.name || '',
          description: apiToken?.description || '',
          type: undefined,
          lifespan: apiToken?.lifespan,
        }}
        enableReinitialize
        onSubmit={(body, actions) => handleSubmit(body as FormValues, actions)}
      >
        {({ errors, handleChange, isSubmitting, values }) => (
          <Form>
            <FormHead
              title={
                isCreating
                  ? {
                      id: 'Settings.adminTokens.createPage.title',
                      defaultMessage: 'Create Admin Token',
                    }
                  : {
                      id: 'Settings.adminTokens.editPage.title',
                      defaultMessage: 'Edit Admin Token',
                    }
              }
              token={apiToken}
              setToken={setApiToken}
              toggleToken={toggleToken}
              showToken={showToken}
              canEditInputs={canEditInputs}
              canRegenerate={canRegenerateToken}
              canShowToken={canShowToken}
              isSubmitting={isSubmitting}
              regenerateUrl="/admin/api-tokens/"
            />

            <Layouts.Content>
              <Flex direction="column" alignItems="stretch" gap={6}>
                {apiToken?.accessKey !== undefined &&
                  apiToken.accessKey !== '' &&
                  showToken === true && (
                    <>
                      <ApiTokenBox token={apiToken.accessKey} tokenType={API_TOKEN_TYPE} />
                    </>
                  )}

                <FormApiTokenContainer
                  errors={errors}
                  onChange={handleChange}
                  canEditInputs={canEditInputs}
                  isCreating={isCreating}
                  values={values}
                  apiToken={apiToken}
                  kind="admin"
                  onDispatch={() => {}}
                  setHasChangedPermissions={() => {}}
                />

                <Box shadow="filterShadow" hasRadius>
                  <AdminPermissions
                    ref={adminPermissionsRef}
                    disabled={!canEditInputs}
                    initialAdminPermissions={initialAdminPermissions}
                    tokenId={!isCreating && id ? id : undefined}
                    ownerUserId={ownerUserId}
                  />
                </Box>
              </Flex>
            </Layouts.Content>
          </Form>
        )}
      </Formik>
    </Page.Main>
  );
};

export const ProtectedEditView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['admin-tokens']?.read
  );

  return (
    <Page.Protect permissions={permissions}>
      <EditView />
    </Page.Protect>
  );
};
