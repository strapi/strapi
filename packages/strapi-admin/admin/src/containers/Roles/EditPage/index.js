import React, { useState } from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useGlobalContext, request } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { Padded } from '@buffetjs/core';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';

import RoleForm from '../../../components/Roles/RoleForm';
import BaselineAlignement from '../../../components/BaselineAlignement';
import ContainerFluid from '../../../components/ContainerFluid';
import { Permissions } from '../../../components/Roles';
import { useFetchRole, useFetchPermissionsLayout } from '../../../hooks';
import { formatPermissionsToApi } from '../../../utils';

import schema from './utils/schema';

const EditPage = () => {
  const { formatMessage } = useIntl();
  const { goBack } = useHistory();
  const { settingsBaseURL } = useGlobalContext();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/roles/:id`);
  const [isSubmiting, setIsSubmiting] = useState(false);

  const { isLoading: isLayoutLoading, data: permissionsLayout } = useFetchPermissionsLayout(id);
  const { role, permissions: rolePermissions, isLoading: isRoleLoading } = useFetchRole(id);

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
            onClick: handleReset,
            color: 'cancel',
            type: 'button',
          },
          {
            label: formatMessage({
              id: 'app.components.Button.save',
              defaultMessage: 'Save',
            }),
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

      await request(`/admin/roles/${id}`, {
        method: 'PUT',
        body: { name: data.name, description: data.description },
      });

      await request(`/admin/roles/${id}/permissions`, {
        method: 'PUT',
        body: { permissions: formatPermissionsToApi(data.permissions) },
      });

      strapi.notification.success('notification.success.saved');
      goBack();
    } catch (err) {
      console.error(err);
      strapi.notification.error('notification.error');
    } finally {
      setIsSubmiting(false);
      strapi.unlockApp();
    }
  };

  return (
    <Formik
      enableReinitialize
      initialValues={{
        name: role.name,
        description: role.description,
        permissions: rolePermissions,
      }}
      onSubmit={handleEditRoleSubmit}
      validationSchema={schema}
      validateOnChange={false}
    >
      {({ handleSubmit, values, errors, setFieldValue, handleReset, handleChange, handleBlur }) => (
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
            <BaselineAlignement top size="3px" />
            <RoleForm
              isLoading={isRoleLoading}
              errors={errors}
              values={values}
              onChange={handleChange}
              onBlur={handleBlur}
              role={role}
            />
            {!isLayoutLoading && !isRoleLoading && (
              <Padded top bottom size="md">
                <Permissions
                  onChange={setFieldValue}
                  permissionsLayout={permissionsLayout}
                  rolePermissions={rolePermissions}
                />
              </Padded>
            )}
          </ContainerFluid>
        </form>
      )}
    </Formik>
  );
};

export default EditPage;
