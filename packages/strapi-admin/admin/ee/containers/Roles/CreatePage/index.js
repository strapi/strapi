import React, { useState, useRef } from 'react';
import { Header } from '@buffetjs/custom';
import { Padded } from '@buffetjs/core';
import { Formik } from 'formik';
import { isEmpty } from 'lodash';
import { useIntl } from 'react-intl';
import { CheckPagePermissions, request } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';

import adminPermissions from '../../../../src/permissions';
import { useFetchPermissionsLayout } from '../../../../src/hooks';
import BaselineAlignement from '../../../../src/components/BaselineAlignement';
import PageTitle from '../../../../src/components/SettingsPageTitle';
import ContainerFluid from '../../../../src/components/ContainerFluid';
import FormCard from '../../../../src/components/FormBloc';
import { ButtonWithNumber, Permissions } from '../../../../src/components/Roles';
import SizedInput from '../../../../src/components/SizedInput';
import { formatPermissionsToApi } from '../../../../src/utils';

import schema from './utils/schema';

const CreatePage = () => {
  const { formatMessage } = useIntl();
  const [isSubmiting, setIsSubmiting] = useState(false);
  const { goBack } = useHistory();
  const permissionsRef = useRef();
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
    strapi.lockAppWithOverlay();
    setIsSubmiting(true);

    Promise.resolve(
      request('/admin/roles', {
        method: 'POST',
        body: data,
      })
    )
      .then(res => {
        const permissionsToSend = permissionsRef.current.getPermissions();

        if (res.data.id && !isEmpty(permissionsToSend)) {
          return request(`/admin/roles/${res.data.id}/permissions`, {
            method: 'PUT',
            body: { permissions: formatPermissionsToApi(permissionsToSend) },
          });
        }

        return res;
      })
      .then(() => {
        strapi.notification.success('Settings.roles.created');
        goBack();
      })
      .catch(err => {
        console.error(err);
        strapi.notification.error('notification.error');
      })
      .finally(() => {
        setIsSubmiting(false);
        strapi.unlockApp();
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
    <>
      <PageTitle name="Roles" />
      <Formik
        initialValues={{ name: '', description: '' }}
        onSubmit={handleCreateRoleSubmit}
        validationSchema={schema}
        validateOnChange={false}
      >
        {({ handleSubmit, values, errors, handleReset, handleChange, handleBlur }) => (
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
                    permissionsLayout={permissionsLayout}
                    rolePermissions={{}}
                    ref={permissionsRef}
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

export default () => (
  <CheckPagePermissions permissions={adminPermissions.settings.roles.create}>
    <CreatePage />
  </CheckPagePermissions>
);

export { CreatePage };
