import React from 'react';
import { Header } from '@buffetjs/custom';
import { Padded } from '@buffetjs/core';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { request } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';

import BaselineAlignement from '../../../../src/components/BaselineAlignement';
import ContainerFluid from '../../../../src/components/ContainerFluid';
import FormCard from '../../../../src/components/FormBloc';
import {
  ButtonWithNumber,
  CollectionTypesPermissions,
  Tabs,
  SingleTypesPermissions,
  PluginsPermissions,
  SettingsPermissions,
} from '../../../../src/components/Roles';
import SizedInput from '../../../../src/components/SizedInput';

import schema from './utils/schema';

const CreatePage = () => {
  const { formatMessage } = useIntl();
  const { goBack } = useHistory();

  const headerActions = (handleSubmit, handleReset) => [
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

  const handleCreateRoleSubmit = async data => {
    try {
      const res = await request('/admin/roles', {
        method: 'POST',
        body: data,
      });

      if (res.data.id) {
        strapi.notification.success('Settings.roles.created');
        goBack();
      }
    } catch (err) {
      //   if (err.response) {
      // const data = get(err, 'response.payload', { data: {} });
      // const apiErrors = formatAPIErrors(data);
      // }
      strapi.notification.error('notification.error');
    }
  };

  const actions = [
    <ButtonWithNumber number={0} onClick={() => console.log('Open user modal')} key="user-button">
      {formatMessage({
        id: 'Settings.roles.form.button.users-with-role',
      })}
    </ButtonWithNumber>,
  ];

  return (
    <Formik
      initialValues={{ name: null, description: null }}
      onSubmit={handleCreateRoleSubmit}
      validationSchema={schema}
    >
      {({ handleSubmit, values, errors, handleReset, handleChange, handleBlur }) => (
        <form onSubmit={handleSubmit}>
          <ContainerFluid padding="0">
            <Header
              title={{
                label: formatMessage({
                  id: 'Settings.roles.create.title',
                }),
              }}
              content={formatMessage({
                id: 'Settings.roles.create.description',
              })}
              actions={headerActions(handleSubmit, handleReset)}
            />
            <BaselineAlignement top size="3px" />
            <FormCard
              actions={actions}
              title={formatMessage({
                id: 'Settings.roles.form.title',
              })}
              subtitle={formatMessage({
                id: 'Settings.roles.form.description',
              })}
            >
              <SizedInput
                label="Name"
                name="name"
                type="text"
                error={errors.name ? { id: errors.name } : null}
                onBlur={handleBlur}
                value={values.name}
                onChange={handleChange}
              />

              <SizedInput
                label="Description"
                name="description"
                type="textarea"
                onBlur={handleBlur}
                value={values.description}
                onChange={handleChange}
                // Override the default height of the textarea
                style={{ height: 115 }}
              />
            </FormCard>

            <Padded top size="md">
              <Tabs tabsLabel={['Collection Types', 'Single Types', 'Plugins', 'Settings']}>
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

export default CreatePage;
