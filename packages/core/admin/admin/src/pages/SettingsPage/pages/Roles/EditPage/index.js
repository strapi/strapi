import React, { useRef, useState } from 'react';

import { Box, Button, ContentLayout, Flex, HeaderLayout, Main } from '@strapi/design-system';
import {
  Link,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useOverlayBlocker,
  useTracking,
} from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useRouteMatch } from 'react-router-dom';

import { useAdminRolePermissions } from '../../../../../hooks/useAdminRolePermissions';
import { useAdminRoles } from '../../../../../hooks/useAdminRoles';
import { useAdminRolePermissionLayout } from '../hooks/useAdminRolePermissionLayout';

import { Permissions, RoleForm } from './components';
import schema from './utils/schema';

const EditPage = () => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const {
    params: { id },
  } = useRouteMatch('/settings/roles/:id');
  const { put } = useFetchClient();
  const [isSubmitting, setIsSubmiting] = useState(false);
  const permissionsRef = useRef();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { trackUsage } = useTracking();
  const { formatAPIError } = useAPIErrorHandler();

  const { isLoading: isLoadingPermissionsLayout, data: permissionsLayout } =
    useAdminRolePermissionLayout(id, {
      cacheTime: 0,
    });

  const {
    roles: [role = {}],
    isLoading: isRoleLoading,
    refetch: refetchRole,
  } = useAdminRoles(
    { id },
    {
      cacheTime: 0,
    }
  );

  const { permissions, isLoading: isLoadingPermissions } = useAdminRolePermissions(
    { id },
    {
      cacheTime: 0,
    }
  );

  // TODO: this should use a react-query mutation
  const handleEditRoleSubmit = async (data) => {
    try {
      lockApp();
      setIsSubmiting(true);

      const { permissionsToSend, didUpdateConditions } = permissionsRef.current.getPermissions();

      await put(`/admin/roles/${id}`, data);

      if (role.code !== 'strapi-super-admin') {
        await put(`/admin/roles/${id}/permissions`, {
          permissions: permissionsToSend,
        });

        if (didUpdateConditions) {
          trackUsage('didUpdateConditions');
        }
      }

      permissionsRef.current.setFormAfterSubmit();

      await refetchRole();

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved' },
      });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    } finally {
      setIsSubmiting(false);
      unlockApp();
    }
  };

  const isFormDisabled = !isRoleLoading && role.code === 'strapi-super-admin';

  return (
    <Main>
      <SettingsPageTitle name="Roles" />
      <Formik
        enableReinitialize
        initialValues={{
          name: role.name,
          description: role.description,
        }}
        onSubmit={handleEditRoleSubmit}
        validationSchema={schema}
        validateOnChange={false}
      >
        {({ handleSubmit, values, errors, handleChange, handleBlur }) => (
          <form onSubmit={handleSubmit}>
            <HeaderLayout
              primaryAction={
                <Flex gap={2}>
                  <Button
                    disabled={role.code === 'strapi-super-admin'}
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
                <Link startIcon={<ArrowLeft />} to="/settings/roles">
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
                  isLoading={isRoleLoading || isLoadingPermissions}
                  disabled={isFormDisabled}
                  errors={errors}
                  values={values}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  role={role}
                />
                {!isLoadingPermissionsLayout && !isRoleLoading && !isLoadingPermissions ? (
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

export default EditPage;
