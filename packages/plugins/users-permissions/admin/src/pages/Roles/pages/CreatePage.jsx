import * as React from 'react';

import {
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  Form,
  SettingsPageTitle,
  useFetchClient,
  useNotification,
  useOverlayBlocker,
  useTracking,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useHistory } from 'react-router-dom';

import UsersPermissions from '../../../components/UsersPermissions';
import { PERMISSIONS } from '../../../constants';
import getTrad from '../../../utils/getTrad';
import { createRoleSchema } from '../constants';
import { usePlugins } from '../hooks/usePlugins';

export const CreatePage = () => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { goBack } = useHistory();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { isLoading: isLoadingPlugins, permissions, routes } = usePlugins();
  const { trackUsage } = useTracking();
  const permissionsRef = React.useRef();
  const { post } = useFetchClient();
  const mutation = useMutation((body) => post(`/users-permissions/roles`, body), {
    onError() {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        },
      });
    },

    onSuccess() {
      trackUsage('didCreateRole');

      toggleNotification({
        type: 'success',
        message: {
          id: getTrad('Settings.roles.created'),
          defaultMessage: 'Role created',
        },
      });

      // Forcing redirecting since we don't have the id in the response
      goBack();
    },
  });

  const handleCreateRoleSubmit = async (data) => {
    lockApp();

    // TODO: refactor. Child -> parent component communication is evil;
    // We should either move the provider one level up or move the state
    // straight into redux.
    const permissions = permissionsRef.current.getPermissions();

    await mutation.mutate({ ...data, ...permissions, users: [] });

    unlockApp();
  };

  return (
    <Main>
      {/* TODO: This needs to be translated */}
      <SettingsPageTitle name="Roles" />
      <Formik
        enableReinitialize
        initialValues={{ name: '', description: '' }}
        onSubmit={handleCreateRoleSubmit}
        validationSchema={createRoleSchema}
      >
        {({ handleSubmit, values, handleChange, errors }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <HeaderLayout
              primaryAction={
                !isLoadingPlugins && (
                  <Button type="submit" loading={mutation.isLoading} startIcon={<Check />}>
                    {formatMessage({
                      id: 'global.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                )
              }
              title={formatMessage({
                id: 'Settings.roles.create.title',
                defaultMessage: 'Create a role',
              })}
              subtitle={formatMessage({
                id: 'Settings.roles.create.description',
                defaultMessage: 'Define the rights given to the role',
              })}
            />
            <ContentLayout>
              <Flex
                background="neutral0"
                direction="column"
                alignItems="stretch"
                gap={7}
                hasRadius
                paddingTop={6}
                paddingBottom={6}
                paddingLeft={7}
                paddingRight={7}
                shadow="filterShadow"
              >
                <Flex direction="column" alignItems="stretch">
                  <Typography variant="delta" as="h2">
                    {formatMessage({
                      id: getTrad('EditPage.form.roles'),
                      defaultMessage: 'Role details',
                    })}
                  </Typography>

                  <Grid gap={4}>
                    <GridItem col={6}>
                      <TextInput
                        name="name"
                        value={values.name || ''}
                        onChange={handleChange}
                        label={formatMessage({
                          id: 'global.name',
                          defaultMessage: 'Name',
                        })}
                        error={
                          errors?.name
                            ? formatMessage({ id: errors.name, defaultMessage: 'Name is required' })
                            : false
                        }
                        required
                      />
                    </GridItem>
                    <GridItem col={6}>
                      <Textarea
                        id="description"
                        value={values.description || ''}
                        onChange={handleChange}
                        label={formatMessage({
                          id: 'global.description',
                          defaultMessage: 'Description',
                        })}
                        error={
                          errors?.description
                            ? formatMessage({
                                id: errors.description,
                                defaultMessage: 'Description is required',
                              })
                            : false
                        }
                        required
                      />
                    </GridItem>
                  </Grid>
                </Flex>

                {!isLoadingPlugins && (
                  <UsersPermissions
                    ref={permissionsRef}
                    permissions={permissions}
                    routes={routes}
                  />
                )}
              </Flex>
            </ContentLayout>
          </Form>
        )}
      </Formik>
    </Main>
  );
};

export const ProtectedRolesCreatePage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.createRole}>
    <CreatePage />
  </CheckPagePermissions>
);
