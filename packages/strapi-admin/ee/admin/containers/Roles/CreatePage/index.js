import React, { useState, useRef } from 'react';
import { Header } from '@buffetjs/custom';
import { Padded } from '@buffetjs/core';
import moment from 'moment';
import { Formik } from 'formik';
import { get, isEmpty } from 'lodash';
import { useIntl } from 'react-intl';
import { CheckPagePermissions, request, useGlobalContext } from 'strapi-helper-plugin';
import { useHistory, useRouteMatch } from 'react-router-dom';
import adminPermissions from '../../../../../admin/src/permissions';
import { useFetchPermissionsLayout, useFetchRole } from '../../../../../admin/src/hooks';
import BaselineAlignement from '../../../../../admin/src/components/BaselineAlignement';
import PageTitle from '../../../../../admin/src/components/SettingsPageTitle';
import ContainerFluid from '../../../../../admin/src/components/ContainerFluid';
import FormCard from '../../../../../admin/src/components/FormBloc';
import { ButtonWithNumber, Permissions } from '../../../../../admin/src/components/Roles';
import SizedInput from '../../../../../admin/src/components/SizedInput';
import { formatPermissionsToApi } from '../../../../../admin/src/utils';

import schema from './utils/schema';

const CreatePage = () => {
  const { formatMessage } = useIntl();
  const [isSubmiting, setIsSubmiting] = useState(false);
  const { goBack } = useHistory();
  const permissionsRef = useRef();
  const { settingsBaseURL } = useGlobalContext();
  const params = useRouteMatch(`${settingsBaseURL}/roles/duplicate/:id`);
  const id = get(params, 'params.id', null);
  const { isLoading: isLayoutLoading, data: permissionsLayout } = useFetchPermissionsLayout();
  const { role, permissions: rolePermissions, isLoading: isRoleLoading } = useFetchRole(id);

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

  const defaultDescription = `${formatMessage({
    id: 'Settings.roles.form.created',
  })} ${moment().format('LL')}`;

  return (
    <>
      <PageTitle name="Roles" />
      <Formik
        initialValues={{ name: '', description: defaultDescription }}
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
              {!isLayoutLoading && !isRoleLoading && (
                <Padded top bottom size="md">
                  <Permissions
                    permissionsLayout={permissionsLayout}
                    ref={permissionsRef}
                    rolePermissions={rolePermissions}
                    role={role}
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
