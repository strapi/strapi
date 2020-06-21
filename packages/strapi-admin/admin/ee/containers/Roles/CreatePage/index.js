import React, { useState } from 'react';
import { Header } from '@buffetjs/custom';
import { Padded } from '@buffetjs/core';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { CheckPagePermissions, request } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import adminPermissions from '../../../../src/permissions';
import { useFetchPermissionsLayout } from '../../../../src/hooks';
import BaselineAlignement from '../../../../src/components/BaselineAlignement';
import ContainerFluid from '../../../../src/components/ContainerFluid';
import FormCard from '../../../../src/components/FormBloc';
import { ButtonWithNumber, Permissions } from '../../../../src/components/Roles';
import SizedInput from '../../../../src/components/SizedInput';
import { formatPermissionsToApi } from '../../../../src/utils';

import schema from './utils/schema';

const CreatePage = () => {
  const { formatMessage } = useIntl();
  const [isSubmiting, setIsSubmiting] = useState(false);
  // @HichamELBSI Adding the layout since you might need it for the plugins sections
  const { goBack } = useHistory();
  const { isLoading: isLayoutLoading, data: permissionsLayout } = useFetchPermissionsLayout();

  const headerActions = (handleSubmit, handleReset) => [
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

  const handleCreateRoleSubmit = data => {
    setIsSubmiting(true);

    Promise.resolve(
      request('/admin/roles', {
        method: 'POST',
        body: { name: data.name, description: data.description },
      })
    )
      .then(res => {
        if (res.data.id && data.permissions) {
          return request(`/admin/roles/${res.data.id}/permissions`, {
            method: 'PUT',
            body: { permissions: formatPermissionsToApi(data.permissions) },
          });
        }

        return res;
      })
      .then(() => {
        strapi.notification.success('Settings.roles.created');
        goBack();
      })
      .catch(() => {
        strapi.notification.error('notification.error');
      })
      .finally(() => {
        setIsSubmiting(false);
      });
  };

  const actions = [
    <ButtonWithNumber number={0} onClick={() => console.log('Open user modal')} key="user-button">
      {formatMessage({
        id: 'Settings.roles.form.button.users-with-role',
        defaultMessage: 'Users with this role',
      })}
    </ButtonWithNumber>,
  ];

  return (
    <Formik
      initialValues={{ name: '', description: '', permissions: {} }}
      onSubmit={handleCreateRoleSubmit}
      validationSchema={schema}
      validateOnChange={false}
    >
      {({ handleSubmit, values, errors, setFieldValue, handleReset, handleChange, handleBlur }) => (
        <form onSubmit={handleSubmit}>
          <ContainerFluid padding="0">
            <Header
              title={{
                label: formatMessage({
                  id: 'Settings.roles.create.title',
                  defaultMessage: 'Create a role',
                }),
              }}
              content={formatMessage({
                id: 'Settings.roles.create.description',
                defaultMessage: 'Define the rights given to the role',
              })}
              actions={headerActions(handleSubmit, handleReset)}
              isLoading={isLayoutLoading}
            />
            <BaselineAlignement top size="3px" />
            <FormCard
              actions={actions}
              title={formatMessage({
                id: 'Settings.roles.form.title',
                defaultMessage: 'Details',
              })}
              subtitle={formatMessage({
                id: 'Settings.roles.form.description',
                defaultMessage: 'Name and description of the role',
              })}
            >
              <SizedInput
                label="Settings.roles.form.input.name"
                defaultMessage="Name"
                name="name"
                type="text"
                error={errors.name ? { id: errors.name } : null}
                onBlur={handleBlur}
                value={values.name}
                onChange={handleChange}
              />

              <SizedInput
                label="Settings.roles.form.input.description"
                defaultMessage="Description"
                name="description"
                type="textarea"
                onBlur={handleBlur}
                value={values.description}
                onChange={handleChange}
                // Override the default height of the textarea
                style={{ height: 115 }}
              />
            </FormCard>
            {!isLayoutLoading && (
              <Padded top bottom size="md">
                <Permissions
                  onChange={setFieldValue}
                  permissionsLayout={permissionsLayout}
                  rolePermissions={values.permissions}
                />
              </Padded>
            )}
          </ContainerFluid>
        </form>
      )}
    </Formik>
  );
};

export default () => (
  <CheckPagePermissions permissions={adminPermissions.settings.roles.create}>
    <CreatePage />
  </CheckPagePermissions>
);

export { CreatePage };
