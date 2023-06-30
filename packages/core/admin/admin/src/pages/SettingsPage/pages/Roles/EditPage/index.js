import React, { useRef, useState } from 'react';

import { Box, Button, ContentLayout, Flex, HeaderLayout, Main } from '@strapi/design-system';
import {
  Link,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useFetchClient,
  useNotification,
  useOverlayBlocker,
  useTracking,
} from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { Formik } from 'formik';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { useRouteMatch } from 'react-router-dom';

import { useFetchPermissionsLayout, useFetchRole } from '../../../../../hooks';

import { Permissions, RoleForm } from './components';
import schema from './utils/schema';

const EditPage = () => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const {
    params: { id },
  } = useRouteMatch('/settings/roles/:id');
  const [isSubmitting, setIsSubmiting] = useState(false);
  const permissionsRef = useRef();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { trackUsage } = useTracking();

  const { isLoading: isLayoutLoading, data: permissionsLayout } = useFetchPermissionsLayout(id);
  const {
    role,
    permissions: rolePermissions,
    isLoading: isRoleLoading,
    onSubmitSucceeded,
  } = useFetchRole(id);

  const { put } = useFetchClient();

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
      onSubmitSucceeded({ name: data.name, description: data.description });

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved' },
      });
    } catch (err) {
      console.error(err.response);

      const errorMessage = get(err, 'response.payload.message', 'An error occured');
      const message = get(err, 'response.payload.data.permissions[0]', errorMessage);

      toggleNotification({
        type: 'warning',
        message,
      });
    } finally {
      setIsSubmiting(false);
      unlockApp();
    }
  };

  const isFormDisabled = role.code === 'strapi-super-admin';

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
                  isLoading={isRoleLoading}
                  disabled={isFormDisabled}
                  errors={errors}
                  values={values}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  role={role}
                />
                {!isLayoutLoading && !isRoleLoading ? (
                  <Box shadow="filterShadow" hasRadius>
                    <Permissions
                      isFormDisabled={isFormDisabled}
                      permissions={rolePermissions}
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
