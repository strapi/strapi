import * as React from 'react';

import { Box, Button, ContentLayout, Flex, HeaderLayout, Main } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import {
  LoadingIndicatorPage,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useOverlayBlocker,
  useTracking,
  translatedErrors,
  useRBAC,
} from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { AxiosError } from 'axios';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { NavLink, Redirect, useRouteMatch } from 'react-router-dom';
import * as yup from 'yup';

import * as PermissonContracts from '../../../../../../shared/contracts/permissions';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useAdminRoles } from '../../../../hooks/useAdminRoles';
import { selectAdminPermissions } from '../../../../selectors';

import { Permissions, PermissionsAPI } from './components/Permissions';
import { RoleForm } from './components/RoleForm';
import { useAdminRolePermissions } from './hooks/useAdminRolePermissions';

const EDIT_ROLE_SCHEMA = yup.object().shape({
  name: yup.string().required(translatedErrors.required),
});

interface EditPageFormValues {
  name: string;
  description: string;
}

const EditPage = () => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const match = useRouteMatch<{ id: string }>('/settings/roles/:id');
  const id = match?.params.id;
  const { put, get } = useFetchClient();
  const [isSubmitting, setIsSubmiting] = React.useState(false);
  const permissionsRef = React.useRef<PermissionsAPI>(null);
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { trackUsage } = useTracking();
  const { formatAPIError } = useAPIErrorHandler();

  const { isLoading: isLoadingPermissionsLayout, data: permissionsLayout } = useQuery(
    ['permissions', id],
    async () => {
      const {
        data: { data },
      } = await get<PermissonContracts.GetAll.Response>('/admin/permissions', {
        // TODO: check with BE why we deviate from our usual admin API format here
        params: { role: id },
      });

      return data;
    },
    {
      cacheTime: 0,
    }
  );

  const {
    roles,
    isLoading: isRoleLoading,
    refetch: refetchRole,
  } = useAdminRoles(
    { id },
    {
      cacheTime: 0,
    }
  );

  const role = roles[0] ?? {};

  const { permissions, isLoading: isLoadingPermissions } = useAdminRolePermissions(
    { id: id ?? null },
    {
      cacheTime: 0,
    }
  );

  // TODO: this should use a react-query mutation
  const handleEditRoleSubmit = async (data: { name: string; description: string }) => {
    try {
      lockApp?.();
      setIsSubmiting(true);

      const { permissionsToSend, didUpdateConditions } =
        permissionsRef.current?.getPermissions() ?? {};

      await put(`/admin/roles/${id}`, data);

      if (role.code !== 'strapi-super-admin') {
        await put(`/admin/roles/${id}/permissions`, {
          permissions: permissionsToSend,
        });

        if (didUpdateConditions) {
          trackUsage('didUpdateConditions');
        }
      }

      permissionsRef.current?.setFormAfterSubmit();

      await refetchRole();

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved' },
      });
    } catch (error) {
      if (error instanceof AxiosError) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      }
    } finally {
      setIsSubmiting(false);
      unlockApp?.();
    }
  };

  const isFormDisabled = !isRoleLoading && role.code === 'strapi-super-admin';

  return (
    <Main>
      <SettingsPageTitle name="Roles" />
      <Formik
        enableReinitialize
        initialValues={{
          name: role.name ?? '',
          description: role.description ?? '',
        }}
        onSubmit={handleEditRoleSubmit}
        validationSchema={EDIT_ROLE_SCHEMA}
        validateOnChange={false}
      >
        {({ handleSubmit, values, errors, handleChange, handleBlur }) => (
          <form onSubmit={handleSubmit}>
            <HeaderLayout
              primaryAction={
                <Flex gap={2}>
                  <Button
                    type="submit"
                    disabled={role.code === 'strapi-super-admin'}
                    // @ts-expect-error –  Incompatibility between forimk and our DS
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    size="L"
                  >
                    {formatMessage({
                      id: 'global.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                </Flex>
              }
              title={formatMessage({
                id: 'Settings.roles.edit.title',
                defaultMessage: 'Edit a role',
              })}
              subtitle={formatMessage({
                id: 'Settings.roles.create.description',
                defaultMessage: 'Define the rights given to the role',
              })}
              navigationAction={
                // @ts-expect-error – the props from the component passed as `as` are not correctly inferred.
                <Link as={NavLink} startIcon={<ArrowLeft />} to="/settings/roles">
                  {formatMessage({
                    id: 'global.back',
                    defaultMessage: 'Back',
                  })}
                </Link>
              }
            />
            <ContentLayout>
              <Flex direction="column" alignItems="stretch" gap={6}>
                <RoleForm
                  disabled={isFormDisabled}
                  errors={errors}
                  values={values}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  role={role}
                />
                {!isLoadingPermissionsLayout &&
                !isRoleLoading &&
                !isLoadingPermissions &&
                permissionsLayout ? (
                  <Box shadow="filterShadow" hasRadius>
                    <Permissions
                      isFormDisabled={isFormDisabled}
                      permissions={permissions}
                      ref={permissionsRef}
                      layout={permissionsLayout}
                    />
                  </Box>
                ) : (
                  <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                    <LoadingIndicatorPage />
                  </Box>
                )}
              </Flex>
            </ContentLayout>
          </form>
        )}
      </Formik>
    </Main>
  );
};

const ProtectedEditPage = () => {
  const permissions = useTypedSelector(selectAdminPermissions);

  const {
    isLoading,
    allowedActions: { canRead, canUpdate },
  } = useRBAC(permissions.settings?.roles);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!canRead && !canUpdate) {
    return <Redirect to="/" />;
  }

  return <EditPage />;
};

export { EditPage, ProtectedEditPage };
export type { EditPageFormValues };
