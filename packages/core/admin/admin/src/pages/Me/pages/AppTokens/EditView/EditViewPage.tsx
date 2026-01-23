import * as React from 'react';

import { Box, Button, Flex } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { Navigate, useLocation, useMatch, useNavigate } from 'react-router-dom';
import * as yup from 'yup';

import { Layouts } from '../../../../../components/Layouts/Layout';
import { Page } from '../../../../../components/PageHelpers';
import { useAuth } from '../../../../../features/Auth';
import { BackButton } from '../../../../../features/BackButton';
import { useNotification } from '../../../../../features/Notifications';
import { useTracking } from '../../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../../hooks/useAPIErrorHandler';
import {
  useCreateAppTokenMutation,
  useGetAppTokenQuery,
  useUpdateAppTokenMutation,
  useRegenerateAppTokenMutation,
  useGetAppTokenPermissionsQuery,
  useUpdateAppTokenPermissionsMutation,
} from '../../../../../services/appTokens';
import { useGetRolePermissionLayoutQuery } from '../../../../../services/users';
import { isBaseQueryError } from '../../../../../utils/baseQuery';
import { translatedErrors } from '../../../../../utils/translatedErrors';
import { ApiTokenBox } from '../../../../Settings/components/Tokens/TokenBox';
import {
  Permissions,
  PermissionsAPI,
} from '../../../../Settings/pages/Roles/components/Permissions';

import { FormAppTokenContainer } from './components/FormAppTokenContainer';

import type { AppToken } from '../../../../../../../shared/contracts/app-token';

const APP_TOKEN_TYPE = 'app-token' as const;

const EDIT_APP_TOKEN_SCHEMA = yup.object().shape({
  name: yup.string().required(translatedErrors.required.id),
  description: yup.string().optional(),
  lifespan: yup.number().nullable(),
});

interface EditAppTokenFormValues {
  name: string;
  description: string;
  lifespan: number | string | null;
}

export const EditView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { state: locationState } = useLocation();
  const [appToken, setAppToken] = React.useState<AppToken | null>(
    locationState?.appToken?.accessKey
      ? {
          ...locationState.appToken,
        }
      : null
  );

  const [showToken, setShowToken] = React.useState(Boolean(locationState?.appToken?.accessKey));
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { trackUsage } = useTracking();
  const permissionsRef = React.useRef<PermissionsAPI>(null);
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const userPermissions = useAuth('EditView', (state) => state.permissions);

  const match = useMatch('/me/app-tokens/:id');
  const id = match?.params?.id;
  const isCreating = id === 'create';
  const navigate = useNavigate();

  const { data: permissionsLayout, isLoading: isLoadingPermissionsLayout } =
    useGetRolePermissionLayoutQuery({
      role: '',
    });

  const {
    data: fetchedAppToken,
    isLoading: isLoadingToken,
    error: tokenError,
  } = useGetAppTokenQuery(id!, {
    skip: isCreating || id === undefined,
  });

  const { data: permissions, isLoading: isLoadingPermissions } = useGetAppTokenPermissionsQuery(
    id!,
    {
      skip: isCreating || id === undefined,
    }
  );

  const [createAppToken] = useCreateAppTokenMutation();
  const [updateAppToken] = useUpdateAppTokenMutation();
  const [regenerateAppToken] = useRegenerateAppTokenMutation();
  const [updateAppTokenPermissions] = useUpdateAppTokenPermissionsMutation();

  React.useEffect(() => {
    if (tokenError) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(tokenError),
      });
    }
  }, [tokenError, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    if (fetchedAppToken && !isCreating) {
      setAppToken((prev) => ({
        ...fetchedAppToken,
        // Preserve accessKey from previous state if it exists
        // (fetchedAppToken never has accessKey, only create/regenerate responses do)
        ...(prev?.accessKey === undefined ? {} : { accessKey: prev.accessKey }),
      }));
    }
  }, [fetchedAppToken, isCreating]);

  // Hide token after timeout
  React.useEffect(() => {
    if (showToken) {
      hideTimerRef.current = setTimeout(() => {
        setShowToken(false);
      }, 60000); // Hide after 1 minute
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [showToken]);

  const handleSubmit = async (
    values: EditAppTokenFormValues,
    formik: FormikHelpers<EditAppTokenFormValues>
  ) => {
    try {
      trackUsage(isCreating ? 'willCreateToken' : 'willEditToken', {
        tokenType: APP_TOKEN_TYPE,
      });

      // Get permissions from the permissions component
      const { permissionsToSend } = permissionsRef.current?.getPermissions() ?? {};

      if (isCreating) {
        const res = await createAppToken({
          ...values,
          lifespan:
            values.lifespan === null || values.lifespan === 0 || values.lifespan === '0'
              ? null
              : Number(values.lifespan),
          permissions: permissionsToSend || [],
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

        setAppToken(res.data);
        setShowToken(true);
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'Settings.appTokens.created',
            defaultMessage: 'App Token created',
          }),
        });

        // Navigate to edit page with the token
        navigate(`/me/app-tokens/${res.data.id}`, {
          state: { appToken: res.data },
          replace: true,
        });
      } else {
        // Update token basic info first
        const res = await updateAppToken({
          id: id!,
          ...values,
          lifespan:
            values.lifespan === null || values.lifespan === 0 || values.lifespan === '0'
              ? null
              : Number(values.lifespan),
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

        // Update permissions separately if they were modified
        if (permissionsToSend) {
          const permRes = await updateAppTokenPermissions({
            id: id!,
            permissions: permissionsToSend,
          });

          if ('error' in permRes) {
            toggleNotification({
              type: 'danger',
              message: formatAPIError(permRes.error),
            });
            return;
          }
        }

        setAppToken(res.data);
        permissionsRef.current?.setFormAfterSubmit();
        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
        });
      }

      trackUsage(isCreating ? 'didCreateToken' : 'didEditToken', {
        tokenType: APP_TOKEN_TYPE,
        type: permissionsToSend && permissionsToSend.length > 0 ? 'custom' : 'full-access',
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  const handleRegenerate = async () => {
    if (!id) return;

    try {
      const res = await regenerateAppToken(id);

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });
        return;
      }

      setAppToken(res.data);
      setShowToken(true);
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'Settings.appTokens.regenerated',
          defaultMessage: 'Token regenerated',
        }),
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  const _toggleToken = () => {
    if (!showToken && !appToken?.accessKey) {
      // If token is not visible and we don't have the accessKey, we need to regenerate
      handleRegenerate();
    } else {
      setShowToken((prev) => !prev);
    }
  };

  if (isLoadingToken || isLoadingPermissionsLayout || isLoadingPermissions) {
    return <Page.Loading />;
  }

  if (!isCreating && !fetchedAppToken && !isLoadingToken && !tokenError) {
    return <Navigate to="/me/app-tokens" />;
  }

  const initialValues: EditAppTokenFormValues = {
    name: appToken?.name || '',
    description: appToken?.description || '',
    lifespan: appToken?.lifespan || null,
  };

  const canEditInputs = true; // Users can always edit their own tokens
  const _canRegenerate = !isCreating;

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          isCreating
            ? { id: 'Settings.appTokens.createPage.title', defaultMessage: 'Create App Token' }
            : { id: 'Settings.appTokens.editPage.title', defaultMessage: 'Edit App Token' }
        )}
      </Page.Title>
      <Formik
        enableReinitialize
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={EDIT_APP_TOKEN_SCHEMA}
      >
        {({ errors, handleChange, isSubmitting, values, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <Layouts.Header
              title={
                isCreating
                  ? formatMessage({
                      id: 'Settings.appTokens.createPage.title',
                      defaultMessage: 'Create App Token',
                    })
                  : appToken?.name
              }
              primaryAction={
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
              }
              navigationAction={<BackButton />}
            />
            <Layouts.Content>
              <Flex direction="column" alignItems="stretch" gap={6}>
                {appToken?.accessKey && showToken && (
                  <ApiTokenBox token={appToken.accessKey} tokenType="app-token" />
                )}

                <FormAppTokenContainer
                  errors={errors}
                  onChange={handleChange}
                  canEditInputs={canEditInputs}
                  isCreating={isCreating}
                  values={values}
                  appToken={appToken}
                />

                {permissionsLayout && (
                  <Box shadow="filterShadow" hasRadius>
                    <Permissions
                      isFormDisabled={false}
                      permissions={permissions || []}
                      ref={permissionsRef}
                      layout={permissionsLayout}
                      userPermissions={userPermissions}
                    />
                  </Box>
                )}
              </Flex>
            </Layouts.Content>
          </form>
        )}
      </Formik>
    </Page.Main>
  );
};

export const ProtectedEditView = () => {
  // No permissions check needed - app tokens are user-scoped
  return <EditView />;
};
