import React, { useState, useRef } from 'react';
import { Main, HeaderLayout, Button } from '@strapi/parts';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useRouteMatch } from 'react-router-dom';
import {
  request,
  useNotification,
  useOverlayBlocker,
  SettingsPageTitle,
} from '@strapi/helper-plugin';

import getTrad from '../../../utils/getTrad';
import pluginId from '../../../pluginId';
import { usePlugins, useFetchRole } from '../../../hooks';

import schema from './utils/schema';

const EditPage = () => {
  const { formatMessage } = useIntl();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const {
    params: { id },
  } = useRouteMatch(`/settings/${pluginId}/roles/:id`);
  const { isLoading } = usePlugins();
  const { role, onSubmitSucceeded } = useFetchRole(id);
  const permissionsRef = useRef();

  const handleCreateRoleSubmit = data => {
    lockApp();
    setIsSubmitting(true);

    const permissions = permissionsRef.current.getPermissions();

    Promise.resolve(
      request(`/${pluginId}/roles/${id}`, {
        method: 'PUT',
        body: { ...data, ...permissions, users: [] },
      })
    )
      .then(() => {
        onSubmitSucceeded({ name: data.name, description: data.description });
        permissionsRef.current.setFormAfterSubmit();
        toggleNotification({
          type: 'success',
          message: { id: getTrad('Settings.roles.edited') },
        });
      })
      .catch(err => {
        console.error(err);
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      })
      .finally(() => {
        setIsSubmitting(false);
        unlockApp();
      });
  };

  return (
    <Main labelledBy="title">
      <SettingsPageTitle name="Roles" />
      <Formik
        enableReinitialize
        initialValues={{ name: role.name, description: role.description }}
        onSubmit={handleCreateRoleSubmit}
        validationSchema={schema}
      >
        {({ handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <HeaderLayout
              id="title"
              primaryAction={
                !isLoading && (
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
                )
              }
              title={role.name}
              subtitle={role.description}
            />
          </form>
        )}
      </Formik>
    </Main>
  );
};

export default EditPage;
