import React, { useState, useRef } from 'react';
import { ContentLayout, HeaderLayout } from '@strapi/parts/Layout';
import {
  Main,
  Button,
  Stack,
  Box,
  GridItem,
  Grid,
  TextInput,
  Textarea,
} from '@strapi/parts';
import { H3 } from '@strapi/parts/Text';
import { CheckIcon } from '@strapi/icons';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useRouteMatch } from 'react-router-dom';
import {
  useOverlayBlocker,
  SettingsPageTitle,
  LoadingIndicatorPage,
  Form,
  useNotification,
} from '@strapi/helper-plugin';

import UsersPermissions from '../../../components/UsersPermissions';
import getTrad from '../../../utils/getTrad';
import pluginId from '../../../pluginId';
import { usePlugins, useFetchRole } from '../../../hooks';
import schema from './utils/schema';
import axiosInstance from '../../../utils/axiosInstance';

const EditPage = () => {
  const { formatMessage } = useIntl();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const {
    params: { id },
  } = useRouteMatch(`/settings/${pluginId}/roles/:id`);
  const { isLoading: isLoadingPlugins, routes, policies } = usePlugins();
  const { role, onSubmitSucceeded, isLoading: isLoadingRole } = useFetchRole(id);
  const permissionsRef = useRef();

  const handleCreateRoleSubmit = async data => {
    // Set loading state
    lockApp();
    setIsSubmitting(true);
    try {
      // Update role in Strapi
      await axiosInstance.put(`/${pluginId}/roles/${id}`, { ...data, users: [] });
      // Notify success
      onSubmitSucceeded({ name: data.name, description: data.description });
      toggleNotification({
        type: 'success',
        message: {
          id: getTrad('Settings.roles.edited'),
          defaultMessage: 'Role edited',
        },
      });
    } catch (err) {
      console.error(err);
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        },
      });
    }
    // Unset loading state
    setIsSubmitting(false);
    unlockApp();
  };

  if (isLoadingRole) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main>
      <SettingsPageTitle name="Roles" />
      <Formik
        enableReinitialize
        initialValues={{ name: role.name, description: role.description }}
        onSubmit={handleCreateRoleSubmit}
        validationSchema={schema}
      >
        {({ handleSubmit, values, handleChange, errors }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <HeaderLayout
              primaryAction={
                !isLoadingPlugins && (
                  <Button
                    disabled={role.code === 'strapi-super-admin'}
                    type="submit"
                    loading={isSubmitting}
                    startIcon={<CheckIcon />}
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
            <ContentLayout>
              <Stack size={7}>
                <Box
                  background="neutral0"
                  hasRadius
                  shadow="filterShadow"
                  paddingTop={6}
                  paddingBottom={6}
                  paddingLeft={7}
                  paddingRight={7}
                >
                  <Stack size={4}>
                    <H3 as="h2">
                      {formatMessage({
                        id: getTrad('EditPage.form.roles'),
                        defaultMessage: 'Role details',
                      })}
                    </H3>
                    <Grid gap={4}>
                      <GridItem col={6}>
                        <TextInput
                          name="name"
                          value={values.name || ''}
                          onChange={handleChange}
                          label={formatMessage({
                            id: 'Settings.roles.form.input.name',
                            defaultMessage: 'Name',
                          })}
                          error={
                            errors.name
                              ? formatMessage({ id: errors.name, defaultMessage: 'Invalid value' })
                              : null
                          }
                        />
                      </GridItem>
                      <GridItem col={6}>
                        <Textarea
                          name="description"
                          value={values.description || ''}
                          onChange={handleChange}
                          label={formatMessage({
                            id: 'Settings.roles.form.input.description',
                            defaultMessage: 'Description',
                          })}
                          error={
                            errors.description
                              ? formatMessage({
                                  id: errors.description,
                                  defaultMessage: 'Invalid value',
                                })
                              : null
                          }
                        />
                      </GridItem>
                    </Grid>
                  </Stack>
                </Box>
                {!isLoadingPlugins && !isLoadingRole && (
                  <UsersPermissions
                    ref={permissionsRef}
                    permissions={role.permissions}
                    routes={routes}
                    policies={policies}
                  />
                )}
              </Stack>
            </ContentLayout>
          </Form>
        )}
      </Formik>
    </Main>
  );
};

export default EditPage;
