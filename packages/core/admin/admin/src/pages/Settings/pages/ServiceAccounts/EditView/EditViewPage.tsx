import * as React from 'react';

import { Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';

import { Form, type FormHelpers } from '../../../../../components/Form';
import { Layouts } from '../../../../../components/Layouts/Layout';
import { Page } from '../../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { useNotification } from '../../../../../features/Notifications';
import { useTracking } from '../../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../../hooks/useAPIErrorHandler';
import { useRBAC } from '../../../../../hooks/useRBAC';
import {
  useCreateServiceAccountMutation,
  useGetServiceAccountQuery,
  useRegenerateServiceAccountMutation,
  useUpdateServiceAccountMutation,
} from '../../../../../services/serviceAccounts';
import { isBaseQueryError } from '../../../../../utils/baseQuery';
import { FormHead } from '../../../components/Tokens/FormHead';
import { TokenBox } from '../../../components/Tokens/TokenBox';

import { FormServiceAccountContainer } from './components/FormServiceAccountContainer';
import { RegenerateServiceAccount } from './components/RegenerateServiceAccount';
import { RoleSection } from './components/RoleSection';
import { schema } from './constants';

import type {
  Get,
  ServiceAccountToken,
} from '../../../../../../../shared/contracts/service-account';
import type { Data } from '@strapi/types';
import type { PermissionMap } from '../../../../../types/permissions';

export const EditView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { state: locationState } = useLocation();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const [serviceAccount, setServiceAccount] = React.useState<ServiceAccountToken | null>(
    locationState?.serviceAccount?.accessKey
      ? {
          ...locationState.serviceAccount,
        }
      : null
  );

  const [showToken, setShowToken] = React.useState(
    Boolean(locationState?.serviceAccount?.accessKey)
  );
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { trackUsage } = useTracking();
  const {
    allowedActions: { canCreate, canUpdate, canRegenerate },
  } = useRBAC((permissions.settings as PermissionMap['settings'])?.['service-accounts']);
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidtionErrors,
  } = useAPIErrorHandler();

  const navigate = useNavigate();

  const match = useMatch('/settings/service-accounts/:id');
  const id = match?.params?.id;
  const isCreating = id === 'create';

  React.useEffect(() => {
    trackUsage(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: 'service-account',
    });
  }, [isCreating, trackUsage]);

  const { data, error, isLoading } = useGetServiceAccountQuery(id!, {
    skip: !id || isCreating || !!serviceAccount,
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
      setServiceAccount(data);
    }
  }, [data]);

  React.useEffect(() => {
    // Only set up timer when token is shown
    if (showToken) {
      hideTimerRef.current = setTimeout(() => {
        setShowToken(false);
      }, 30000); // 30 seconds

      // Cleanup on unmount or when showToken changes
      return () => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
      };
    }
  }, [showToken]);

  const [createToken] = useCreateServiceAccountMutation();
  const [updateToken] = useUpdateServiceAccountMutation();
  const [regenerateToken] = useRegenerateServiceAccountMutation();

  interface FormValues extends Pick<Get.Response['data'], 'name' | 'description'> {
    lifespan: Get.Response['data']['lifespan'] | undefined;
    roles: Data.ID[];
  }

  const handleSubmit = async (body: FormValues, helpers: FormHelpers<FormValues>) => {
    trackUsage(isCreating ? 'willCreateToken' : 'willEditToken', {
      tokenType: 'service-account',
    });

    try {
      if (isCreating) {
        const res = await createToken({
          ...body,
          // lifespan must be "null" for unlimited (0 would mean instantly expired and isn't accepted)
          lifespan:
            body?.lifespan && body.lifespan !== '0' ? parseInt(body.lifespan.toString(), 10) : null,
          roles: body.roles.map((r) => {
            if (typeof r === 'string') {
              return parseInt(r, 10);
            }
            return typeof r === 'number' ? r : (r as Data.ID);
          }),
        });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            helpers.setErrors(formatValidtionErrors(res.error));
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
            id: 'notification.success.serviceaccountcreated',
            defaultMessage: 'Service Account successfully created',
          }),
        });

        trackUsage('didCreateToken', {
          tokenType: 'service-account',
        });

        setServiceAccount(res.data);
        setShowToken(true);
      } else {
        const res = await updateToken({
          id: id!,
          name: body.name,
          description: body.description,
          roles: body.roles.map((r) => {
            if (typeof r === 'string') {
              return parseInt(r, 10);
            }
            return typeof r === 'number' ? r : (r as Data.ID);
          }),
        });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            helpers.setErrors(formatValidtionErrors(res.error));
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
            id: 'notification.success.serviceaccountedited',
            defaultMessage: 'Service Account successfully edited',
          }),
        });

        trackUsage('didEditToken', {
          tokenType: 'service-account',
        });

        setServiceAccount(res.data);
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

  const handleRegenerate = (newKey: string) => {
    if (serviceAccount) {
      setServiceAccount({
        ...serviceAccount,
        accessKey: newKey,
      });
      setShowToken(true);
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'notification.success.serviceaccountregenerated',
          defaultMessage: 'Service Account successfully regenerated',
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
  const canShowToken = !!serviceAccount?.accessKey;

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'Service Accounts' }
        )}
      </Page.Title>
      <Form
        method={isCreating ? 'POST' : 'PUT'}
        validationSchema={schema}
        initialValues={{
          name: serviceAccount?.name || '',
          description: serviceAccount?.description || '',
          lifespan: serviceAccount?.lifespan,
          roles: serviceAccount?.roles?.map((r) => (typeof r === 'object' ? r.id : r)) || [],
        }}
        onSubmit={(body, actions) => handleSubmit(body, actions)}
      >
        {({ errors, onChange, isSubmitting, values }) => {
          const handleChange = React.useCallback(
            ({ target: { name, value } }: { target: { name: string; value: string } }) => {
              onChange(name, value);
            },
            [onChange]
          );

          const formattedErrors = React.useMemo(() => {
            const result: Record<string, string | undefined> = {};
            if (errors.name !== undefined) {
              if (typeof errors.name === 'string') {
                result.name = errors.name;
              } else if (errors.name && typeof errors.name === 'object' && 'id' in errors.name) {
                result.name = formatMessage({
                  id: errors.name.id,
                  defaultMessage: errors.name.defaultMessage || errors.name.id,
                });
              }
            }
            if (errors.description !== undefined) {
              if (typeof errors.description === 'string') {
                result.description = errors.description;
              } else if (
                errors.description &&
                typeof errors.description === 'object' &&
                'id' in errors.description
              ) {
                result.description = formatMessage({
                  id: errors.description.id,
                  defaultMessage: errors.description.defaultMessage || errors.description.id,
                });
              }
            }
            if (errors.lifespan !== undefined) {
              if (typeof errors.lifespan === 'string') {
                result.lifespan = errors.lifespan;
              } else if (
                errors.lifespan &&
                typeof errors.lifespan === 'object' &&
                'id' in errors.lifespan
              ) {
                result.lifespan = formatMessage({
                  id: errors.lifespan.id,
                  defaultMessage: errors.lifespan.defaultMessage || errors.lifespan.id,
                });
              }
            }
            return result;
          }, [errors, formatMessage]);

          return (
            <>
              <FormHead
                title={{
                  id: isCreating
                    ? 'Settings.serviceAccounts.createPage.title'
                    : 'Settings.serviceAccounts.editPage.title',
                  defaultMessage: isCreating ? 'Create Service Account' : 'Edit Service Account',
                }}
                token={serviceAccount}
                setToken={setServiceAccount}
                toggleToken={toggleToken}
                showToken={showToken}
                canEditInputs={canEditInputs}
                canRegenerate={canRegenerate}
                canShowToken={canShowToken}
                isSubmitting={isSubmitting}
                regenerateUrl="/admin/service-accounts/"
                regenerateComponent={
                  canRegenerate && serviceAccount?.id ? (
                    <RegenerateServiceAccount
                      tokenId={serviceAccount.id}
                      onRegenerate={handleRegenerate}
                    />
                  ) : undefined
                }
              />

              <Layouts.Content>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  {serviceAccount?.accessKey && showToken && (
                    <>
                      <TokenBox token={serviceAccount.accessKey} tokenType="api-token" />
                    </>
                  )}

                  <FormServiceAccountContainer
                    errors={formattedErrors}
                    onChange={handleChange}
                    canEditInputs={canEditInputs}
                    isCreating={isCreating}
                    values={values}
                    serviceAccount={serviceAccount}
                  />
                  <RoleSection disabled={!canEditInputs} />
                </Flex>
              </Layouts.Content>
            </>
          );
        }}
      </Form>
    </Page.Main>
  );
};

export const ProtectedEditView = () => {
  const permissions = useTypedSelector(
    (state) =>
      (state.admin_app.permissions.settings as PermissionMap['settings'])?.['service-accounts']?.read
  );

  return (
    <Page.Protect permissions={permissions}>
      <EditView />
    </Page.Protect>
  );
};

