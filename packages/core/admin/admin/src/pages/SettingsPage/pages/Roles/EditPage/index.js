import React, { useRef, useState } from 'react';
import {
  request,
  useNotification,
  useOverlayBlocker,
  useTracking,
  LoadingIndicatorPage,
  SettingsPageTitle,
  Link,
} from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Stack } from '@strapi/design-system/Stack';
import { Formik } from 'formik';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { useRouteMatch } from 'react-router-dom';
import { Permissions, RoleForm } from './components';
import { useFetchPermissionsLayout, useFetchRole } from '../../../../../hooks';
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

  const handleEditRoleSubmit = async data => {
    try {
      lockApp();
      setIsSubmiting(true);

      const { permissionsToSend, didUpdateConditions } = permissionsRef.current.getPermissions();

      await request(`/admin/roles/${id}`, {
        method: 'PUT',
        body: data,
      });

      if (role.code !== 'strapi-super-admin') {
        await request(`/admin/roles/${id}/permissions`, {
          method: 'PUT',
          body: {
            permissions: permissionsToSend,
          },
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

      const errorMessage = get(err, 'response.payload.message', 'An error occurred');
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
            <>
              <HeaderLayout
                primaryAction={
                  <Stack horizontal spacing={2}>
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
                  </Stack>
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
                <Stack spacing={6}>
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
                </Stack>
              </ContentLayout>
            </>
          </form>
        )}
      </Formik>
    </Main>
  );
};

export default EditPage;
