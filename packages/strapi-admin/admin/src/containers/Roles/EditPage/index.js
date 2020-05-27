import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import BaselineAlignement from '../../../components/BaselineAlignement';
import ContainerFluid from '../../../components/ContainerFluid';
import FormCard from '../../../components/FormBloc';
import {
  ButtonWithNumber,
  CollectionTypesPermissions,
  Tabs,
  SingleTypesPermissions,
  PluginsPermissions,
  SettingsPermissions,
} from '../../../components/Roles';
import SizedInput from '../../../components/SizedInput';

import schema from './utils/schema';

const EditPage = () => {
  const { formatMessage } = useIntl();
  const { settingsBaseURL } = useGlobalContext();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/roles/:id`);

  console.log({ id });

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
      console.log('Handle submit POST API', data);
    } catch (e) {
      console.error(e);
    }
  };

  const cta = (
    <ButtonWithNumber number={0} onClick={() => console.log('Open user modal')}>
      {formatMessage({
        id: 'Settings.roles.form.button.users-with-role',
      })}
    </ButtonWithNumber>
  );

  return (
    <Formik
      initialValues={{ name: '', description: '' }}
      onSubmit={handleCreateRoleSubmit}
      validationSchema={schema}
    >
      {({ handleSubmit, values, errors, handleReset, handleChange, handleBlur }) => (
        <form onSubmit={handleSubmit}>
          <ContainerFluid padding="0">
            <Header
              title={{
                label: formatMessage({
                  id: 'Settings.roles.edit.title',
                  defaultMessage: 'Edit Role',
                }),
              }}
              content={formatMessage({
                id: 'Settings.roles.create.description',
              })}
              actions={headerActions(handleSubmit, handleReset)}
            />
            <BaselineAlignement top size="3px" />
            <FormCard
              title={formatMessage({
                id: 'Settings.roles.form.title',
              })}
              subtitle={formatMessage({
                id: 'Settings.roles.form.description',
              })}
              cta={cta}
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

            <BaselineAlignement top size="30px">
              <Tabs tabsLabel={['Collection Types', 'Single Types', 'Plugins', 'Settings']}>
                <CollectionTypesPermissions />
                <SingleTypesPermissions />
                <PluginsPermissions />
                <SettingsPermissions />
              </Tabs>
            </BaselineAlignement>
          </ContainerFluid>
        </form>
      )}
    </Formik>
  );
};

export default EditPage;
