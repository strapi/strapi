import * as React from 'react';

import {
  Button,
  Flex,
  Grid,
  Main,
  Textarea,
  TextInput,
  Typography,
  Field,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { Page, useTracking, useNotification, useFetchClient, Layouts } from '@strapi/strapi/admin';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';

import UsersPermissions from '../../../components/UsersPermissions';
import { PERMISSIONS } from '../../../constants';
import getTrad from '../../../utils/getTrad';
import { createRoleSchema } from '../constants';
import { usePlugins } from '../hooks/usePlugins';

export const CreatePage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();
  const { isLoading: isLoadingPlugins, permissions, routes } = usePlugins();
  const { trackUsage } = useTracking();
  const permissionsRef = React.useRef();
  const { post } = useFetchClient();
  const mutation = useMutation((body) => post(`/users-permissions/roles`, body), {
    onError() {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        }),
      });
    },

    onSuccess() {
      trackUsage('didCreateRole');

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTrad('Settings.roles.created'),
          defaultMessage: 'Role created',
        }),
      });

      // Forcing redirecting since we don't have the id in the response
      navigate(-1);
    },
  });

  const handleCreateRoleSubmit = async (data) => {
    // TODO: refactor. Child -> parent component communication is evil;
    // We should either move the provider one level up or move the state
    // straight into redux.
    const permissions = permissionsRef.current.getPermissions();

    await mutation.mutate({ ...data, ...permissions, users: [] });
  };

  return (
    <Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'Roles' }
        )}
      </Page.Title>
      <Formik
        enableReinitialize
        initialValues={{ name: '', description: '' }}
        onSubmit={handleCreateRoleSubmit}
        validationSchema={createRoleSchema}
      >
        {({ handleSubmit, values, handleChange, errors }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <Layouts.Header
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
            <Layouts.Content>
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
                  <Typography variant="delta" tag="h2">
                    {formatMessage({
                      id: getTrad('EditPage.form.roles'),
                      defaultMessage: 'Role details',
                    })}
                  </Typography>

                  <Grid.Root gap={4}>
                    <Grid.Item col={6} direction="column" alignItems="stretch">
                      <Field.Root
                        name="name"
                        error={
                          errors?.name
                            ? formatMessage({ id: errors.name, defaultMessage: 'Name is required' })
                            : false
                        }
                        required
                      >
                        <Field.Label>
                          {formatMessage({
                            id: 'global.name',
                            defaultMessage: 'Name',
                          })}
                        </Field.Label>
                        <TextInput value={values.name || ''} onChange={handleChange} />
                        <Field.Error />
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={6} direction="column" alignItems="stretch">
                      <Field.Root
                        name="description"
                        error={
                          errors?.description
                            ? formatMessage({
                                id: errors.description,
                                defaultMessage: 'Description is required',
                              })
                            : false
                        }
                        required
                      >
                        <Field.Label>
                          {formatMessage({
                            id: 'global.description',
                            defaultMessage: 'Description',
                          })}
                        </Field.Label>
                        <Textarea value={values.description || ''} onChange={handleChange} />
                        <Field.Error />
                      </Field.Root>
                    </Grid.Item>
                  </Grid.Root>
                </Flex>

                {!isLoadingPlugins && (
                  <UsersPermissions
                    ref={permissionsRef}
                    permissions={permissions}
                    routes={routes}
                  />
                )}
              </Flex>
            </Layouts.Content>
          </Form>
        )}
      </Formik>
    </Main>
  );
};

export const ProtectedRolesCreatePage = () => (
  <Page.Protect permissions={PERMISSIONS.createRole}>
    <CreatePage />
  </Page.Protect>
);
