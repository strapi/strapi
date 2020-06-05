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

import schema from './utils/schema';

const EditPage = () => {
  const { formatMessage } = useIntl();
  const { goBack } = useHistory();
  const { settingsBaseURL } = useGlobalContext();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/roles/:id`);
  const [isSubmiting, setIsSubmiting] = useState(false);

  // Retrieve the view's layout
  const { isLoading: isLayoutLoading } = useFetchPermissionsLayout();
  const { data: role, isLoading: isRoleLoading } = useFetchRole(id);

  /* eslint-disable indent */
  const headerActions = (handleSubmit, handleReset) =>
    isLayoutLoading && isRoleLoading
      ? []
      : [
          {
            label: formatMessage({
              id: 'app.components.Button.reset',
            }),
            onClick: handleReset,
            color: 'cancel',
            type: 'button',
          },
          {
            label: formatMessage({
              id: 'app.components.Button.save',
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
        body: data,
      });

      strapi.notification.success('notification.success.saved');
      goBack();
    } catch (err) {
      // TODO : Uncomment when the API handle clean errors

      //   if (err.response) {
      // const data = get(err, 'response.payload', { data: {} });
      // const apiErrorsMessage = formatAPIErrors(data);
      // strapi.notification.error(apiErrorsMessage);
      // }
      strapi.notification.error('notification.error');
    } finally {
      setIsSubmiting(false);
      strapi.unlockApp();
    }
  };

  return (
    <Formik
      enableReinitialize
      initialValues={{ name: role.name, description: role.description }}
      onSubmit={handleEditRoleSubmit}
      validationSchema={schema}
    >
      {({ handleSubmit, values, errors, handleReset, handleChange, handleBlur }) => (
        <form onSubmit={handleSubmit}>
          <ContainerFluid padding="0">
            <Header
              title={{
                label: formatMessage({
                  // TODO change trad
                  id: 'Settings.roles.edit.title',
                }),
              }}
              content={formatMessage({
                id: 'Settings.roles.create.description',
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
                <Permissions />
              </Padded>
            )}
          </ContainerFluid>
        </form>
      )}
    </Formik>
  );
};

export default EditPage;
