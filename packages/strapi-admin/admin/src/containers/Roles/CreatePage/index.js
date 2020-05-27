import React from 'react';
import { Header, Inputs } from '@buffetjs/custom';
import { Text, Flex, Padded } from '@buffetjs/core';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';

import FormCard from './FormCard';
import ButtonWithNumber from './ButtonWithNumber';
import InputWrapper from './InputWrapper';
import schema from './utils/schema';
import {
  Tabs,
  CollectionTypesPermissions,
  SingleTypesPermissions,
  PluginsPermissions,
  SettingsPermissions,
} from '../../../components/Roles';

const CreatePage = () => {
  const { formatMessage } = useIntl();

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
      type: 'button',
    },
  ];

  const handleCreateRoleSubmit = async data => {
    try {
      console.log('Handle submit POST API', data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Formik
      initialValues={{ name: '', description: '' }}
      onSubmit={handleCreateRoleSubmit}
      validationSchema={schema}
    >
      {({ handleSubmit, values, errors, handleReset, handleChange, handleBlur }) => (
        <>
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
          <FormCard>
            <Padded bottom size="sm">
              <Flex justifyContent="space-between">
                <div>
                  <Text fontSize="lg" fontWeight="bold" lineHeight="1.8rem">
                    {formatMessage({
                      id: 'Settings.roles.form.title',
                    })}
                  </Text>
                  <Text color="grey">
                    {formatMessage({
                      id: 'Settings.roles.form.description',
                    })}
                  </Text>
                </div>
                <ButtonWithNumber number={0} onClick={() => console.log('Open user modal')}>
                  {formatMessage({
                    id: 'Settings.roles.form.button.users-with-role',
                  })}
                </ButtonWithNumber>
              </Flex>
            </Padded>
            <Padded top size="sm" />
            <Flex justifyContent="space-between">
              <InputWrapper>
                <Inputs
                  label="Name"
                  name="name"
                  type="text"
                  error={errors.name ? formatMessage({ id: errors.name }) : null}
                  onBlur={handleBlur}
                  value={values.name}
                  onChange={handleChange}
                />
              </InputWrapper>
              <Padded left size="md" />
              <InputWrapper>
                <Inputs
                  label="Description"
                  name="description"
                  type="textarea"
                  onBlur={handleBlur}
                  value={values.description}
                  onChange={handleChange}
                />
              </InputWrapper>
            </Flex>
          </FormCard>
          <Padded top size="md" />
          <Padded top size="xs">
            <Tabs tabsLabel={['Collection Types', 'Single Types', 'Plugins', 'Settings']}>
              <CollectionTypesPermissions />
              <SingleTypesPermissions />
              <PluginsPermissions />
              <SettingsPermissions />
            </Tabs>
          </Padded>
        </>
      )}
    </Formik>
  );
};

export default CreatePage;
