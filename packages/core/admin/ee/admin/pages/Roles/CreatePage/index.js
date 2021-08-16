import { Padded } from '@buffetjs/core';
import {
  BaselineAlignment,
  CheckPagePermissions,
  request,
  useNotification,
  useOverlayBlocker,
  useTracking,
} from '@strapi/helper-plugin';
import { Button, HeaderLayout, Stack } from '@strapi/parts';
import { Formik } from 'formik';
import { get, isEmpty } from 'lodash';
import moment from 'moment';
import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory, useRouteMatch } from 'react-router-dom';
import FormCard from '../../../../../admin/src/components/FormBloc';
import { ButtonWithNumber } from '../../../../../admin/src/components/Roles';
import Permissions from '../../../../../admin/src/components/Roles/Permissions';
import PageTitle from '../../../../../admin/src/components/SettingsPageTitle';
import SizedInput from '../../../../../admin/src/components/SizedInput';
import { useFetchPermissionsLayout, useFetchRole } from '../../../../../admin/src/hooks';
import adminPermissions from '../../../../../admin/src/permissions';
import schema from './utils/schema';

const CreatePage = () => {
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { formatMessage } = useIntl();
  const [, setIsSubmiting] = useState(false);
  const { replace } = useHistory();
  const permissionsRef = useRef();
  const { trackUsage } = useTracking();
  const params = useRouteMatch('/settings/roles/duplicate/:id');
  const id = get(params, 'params.id', null);
  const { isLoading: isLayoutLoading, data: permissionsLayout } = useFetchPermissionsLayout();
  const { permissions: rolePermissions, isLoading: isRoleLoading } = useFetchRole(id);

  const handleCreateRoleSubmit = data => {
    lockApp();
    setIsSubmiting(true);

    if (id) {
      trackUsage('willDuplicateRole');
    } else {
      trackUsage('willCreateNewRole');
    }

    Promise.resolve(
      request('/admin/roles', {
        method: 'POST',
        body: data,
      })
    )
      .then(async res => {
        const { permissionsToSend } = permissionsRef.current.getPermissions();

        if (id) {
          trackUsage('didDuplicateRole');
        } else {
          trackUsage('didCreateNewRole');
        }

        if (res.data.id && !isEmpty(permissionsToSend)) {
          await request(`/admin/roles/${res.data.id}/permissions`, {
            method: 'PUT',
            body: { permissions: permissionsToSend },
          });
        }

        return res;
      })
      .then(res => {
        setIsSubmiting(false);
        toggleNotification({
          type: 'success',
          message: { id: 'Settings.roles.created' },
        });
        replace(`/settings/roles/${res.data.id}`);
      })
      .catch(err => {
        console.error(err);
        setIsSubmiting(false);
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      })
      .finally(() => {
        unlockApp();
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
            <>
              <HeaderLayout
                primaryAction={
                  <Stack horizontal size={2}>
                    <Button
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
                    <Button onClick={handleSubmit}>
                      {formatMessage({
                        id: 'app.components.Button.save',
                        defaultMessage: 'Save',
                      })}
                    </Button>
                  </Stack>
                }
                title={formatMessage({
                  id: 'Settings.roles.create.title',
                  defaultMessage: 'Create a role',
                })}
                subtitle={formatMessage({
                  id: 'Settings.roles.create.description',
                  defaultMessage: 'Define the rights given to the role',
                })}
                as="h1"
              />
              <BaselineAlignment top size="3px" />
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
                    isFormDisabled={false}
                    ref={permissionsRef}
                    permissions={rolePermissions}
                    layout={permissionsLayout}
                  />
                </Padded>
              )}
            </>
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
