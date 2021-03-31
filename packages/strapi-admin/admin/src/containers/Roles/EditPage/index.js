import React, { useState, useRef } from 'react';
import { useRouteMatch } from 'react-router-dom';
import get from 'lodash/get';
import { BaselineAlignment, useGlobalContext, request } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { Padded } from '@buffetjs/core';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import PageTitle from '../../../components/SettingsPageTitle';
import ContainerFluid from '../../../components/ContainerFluid';
import { Permissions, RoleForm } from '../../../components/Roles';
import { useFetchRole, useFetchPermissionsLayout } from '../../../hooks';
import schema from './utils/schema';

const EditPage = () => {
  const { formatMessage } = useIntl();
  const { emitEvent, settingsBaseURL } = useGlobalContext();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/roles/:id`);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const permissionsRef = useRef();

  const { isLoading: isLayoutLoading, data: permissionsLayout } = useFetchPermissionsLayout(id);
  const {
    role,
    permissions: rolePermissions,
    isLoading: isRoleLoading,
    onSubmitSucceeded,
  } = useFetchRole(id);

  /* eslint-disable indent */
  const headerActions = (handleSubmit, handleReset) =>
    isLayoutLoading && isRoleLoading
      ? []
      : [
          {
            label: formatMessage({
              id: 'app.components.Button.reset',
              defaultMessage: 'Reset',
            }),
            disabled: role.code === 'strapi-super-admin',
            onClick: () => {
              handleReset();
              permissionsRef.current.resetForm();
            },
            color: 'cancel',
            type: 'button',
          },
          {
            label: formatMessage({
              id: 'app.components.Button.save',
              defaultMessage: 'Save',
            }),
            disabled: role.code === 'strapi-super-admin',
            onClick: handleSubmit,
            color: 'success',
            type: 'submit',
            isLoading: isSubmiting,
          },
        ];
  /* eslint-enable indent */

  const handleEditRoleSubmit = async data => {
    try {
      strapi.lockAppWithOverlay();
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
          emitEvent('didUpdateConditions');
        }
      }

      permissionsRef.current.setFormAfterSubmit();
      onSubmitSucceeded({ name: data.name, description: data.description });

      strapi.notification.toggle({
        type: 'success',
        message: { id: 'notification.success.saved' },
      });
    } catch (err) {
      console.error(err.response);

      const errorMessage = get(err, 'response.payload.message', 'An error occured');
      const message = get(err, 'response.payload.data.permissions[0]', errorMessage);

      strapi.notification.toggle({
        type: 'warning',
        message,
      });
    } finally {
      setIsSubmiting(false);
      strapi.unlockApp();
    }
  };

  const isFormDisabled = role.code === 'strapi-super-admin';

  return (
    <>
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
            <ContainerFluid padding="0">
              <Header
                title={{
                  label: formatMessage({
                    id: 'Settings.roles.edit.title',
                    defaultMessage: 'Edit a role',
                  }),
                }}
                content={formatMessage({
                  id: 'Settings.roles.create.description',
                  defaultMessage: 'Define the rights given to the role',
                })}
                actions={headerActions(handleSubmit, handleReset)}
                isLoading={isLayoutLoading || isRoleLoading}
              />
              <BaselineAlignment top size="3px" />
              <RoleForm
                isLoading={isRoleLoading}
                disabled={isFormDisabled}
                errors={errors}
                values={values}
                onChange={handleChange}
                onBlur={handleBlur}
                role={role}
              />
              {!isLayoutLoading && !isRoleLoading && (
                <Padded top bottom size="md">
                  <Permissions
                    isFormDisabled={isFormDisabled}
                    permissions={rolePermissions}
                    ref={permissionsRef}
                    layout={permissionsLayout}
                  />
                </Padded>
              )}
            </ContainerFluid>
          </form>
        )}
      </Formik>
    </>
  );
};

export default EditPage;
