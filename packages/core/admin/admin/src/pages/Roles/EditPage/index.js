import {
  request,
  useNotification,
  useOverlayBlocker,
  useTracking,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { Box, Button, HeaderLayout, Main, Stack, ContentLayout } from '@strapi/parts';
import { Formik } from 'formik';
import get from 'lodash/get';
import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useRouteMatch } from 'react-router-dom';
import { Permissions, RoleForm } from '../../../components/Roles';
import PageTitle from '../../../components/SettingsPageTitle';
import { useFetchPermissionsLayout, useFetchRole } from '../../../hooks';
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
    <Main labelledBy="title">
      <PageTitle name="Roles" />
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
        {({ handleSubmit, values, errors, handleReset, handleChange, handleBlur }) => (
          <form onSubmit={handleSubmit}>
            <>
              <HeaderLayout
                id="title"
                primaryAction={
                  <Stack horizontal size={2}>
                    <Button
                      variant="secondary"
                      disabled={role.code === 'strapi-super-admin'}
                      onClick={() => {
                        handleReset();
                        permissionsRef.current.resetForm();
                      }}
                    >
                      {formatMessage({
                        id: 'app.components.Button.reset',
                        defaultMessage: 'Reset',
                      })}
                    </Button>
                    <Button
                      disabled={role.code === 'strapi-super-admin'}
                      onClick={handleSubmit}
                      loading={isSubmitting}
                    >
                      {formatMessage({
                        id: 'app.components.Button.save',
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
                as="h1"
              />
              <ContentLayout>
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
                  <Box paddingTop={6} paddingBottom={6}>
                    <Permissions
                      isFormDisabled={isFormDisabled}
                      permissions={rolePermissions}
                      ref={permissionsRef}
                      layout={permissionsLayout}
                    />
                  </Box>
                ) : (
                  <LoadingIndicatorPage />
                )}
              </ContentLayout>
            </>
          </form>
        )}
      </Formik>
    </Main>
  );
};

export default EditPage;
