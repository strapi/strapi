import React from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { Padded } from '@buffetjs/core';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import RoleForm from 'ee_else_ce/components/Roles/RoleForm';

import BaselineAlignement from '../../../components/BaselineAlignement';
import ContainerFluid from '../../../components/ContainerFluid';
import {
  CollectionTypesPermissions,
  Tabs,
  SingleTypesPermissions,
  PluginsPermissions,
  SettingsPermissions,
} from '../../../components/Roles';
import { useFetchRole, useFetchPermissionsLayout } from '../../../hooks';

import schema from './utils/schema';

const EditPage = () => {
  const { formatMessage } = useIntl();
  const { goBack } = useHistory();
  const { settingsBaseURL } = useGlobalContext();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/roles/:id`);

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
          },
        ];
  /* eslint-enable indent */

  const handleEditRoleSubmit = async () => {
    try {
      // TODO : Uncomment when the API is done.

      // const res = await request(`/admin/roles/${id}`, {
      //   method: 'POST',
      //   body: data,
      // });

      // if (res.data.id) {
      strapi.notification.success('Settings.roles.edited');
      goBack();
      // }
    } catch (err) {
      // TODO : Uncomment when the API handle clean errors

      //   if (err.response) {
      // const data = get(err, 'response.payload', { data: {} });
      // const apiErrorsMessage = formatAPIErrors(data);
      // strapi.notification.error(apiErrorsMessage);
      // }
      strapi.notification.error('notification.error');
    }
  };

  return (
    <Formik
      enableReinitialize
      initialValues={role}
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
            />
            <BaselineAlignement top size="3px" />
            <RoleForm
              isLoading={isRoleLoading}
              errors={errors}
              values={values}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <Padded top size="md">
              <Tabs
                isLoading={isLayoutLoading}
                tabsLabel={['Collection Types', 'Single Types', 'Plugins', 'Settings']}
              >
                <CollectionTypesPermissions />
                <SingleTypesPermissions />
                <PluginsPermissions />
                <SettingsPermissions />
              </Tabs>
            </Padded>
          </ContainerFluid>
        </form>
      )}
    </Formik>
  );
};

export default EditPage;
