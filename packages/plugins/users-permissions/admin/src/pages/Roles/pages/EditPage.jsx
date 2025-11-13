import * as React from 'react';

import {
  Button,
  Flex,
  TextInput,
  Textarea,
  Typography,
  Grid,
  Field,
  Box,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import {
  Page,
  BackButton,
  useAPIErrorHandler,
  useNotification,
  useFetchClient,
  Layouts,
} from '@strapi/strapi/admin';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import { useQuery, useMutation } from 'react-query';
import { useMatch } from 'react-router-dom';

import UsersPermissions from '../../../components/UsersPermissions';
import { PERMISSIONS } from '../../../constants';
import getTrad from '../../../utils/getTrad';
import { createRoleSchema } from '../constants';
import { usePlugins } from '../hooks/usePlugins';

export const EditPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const {
    params: { id },
  } = useMatch(`/settings/users-permissions/roles/:id`);
  const { get } = useFetchClient();
  const { isLoading: isLoadingPlugins, routes } = usePlugins();
  const {
    data: role,
    isLoading: isLoadingRole,
    refetch: refetchRole,
  } = useQuery(['users-permissions', 'role', id], async () => {
    // TODO: why doesn't this endpoint follow the admin API conventions?
    const {
      data: { role },
    } = await get(`/users-permissions/roles/${id}`);

    return role;
  });

  const permissionsRef = React.useRef();
  const { put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const mutation = useMutation((body) => put(`/users-permissions/roles/${id}`, body), {
    onError(error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    },

    async onSuccess() {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTrad('Settings.roles.created'),
          defaultMessage: 'Role edited',
        }),
      });

      await refetchRole();
    },
  });

  const handleEditRoleSubmit = async (data) => {
    const permissions = permissionsRef.current.getPermissions();

    await mutation.mutate({ ...data, ...permissions, users: [] });
  };

  if (isLoadingRole) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'Roles' }
        )}
      </Page.Title>
      <Formik
        enableReinitialize
        initialValues={{ name: role.name, description: role.description }}
        onSubmit={handleEditRoleSubmit}
        validationSchema={createRoleSchema}
      >
        {({ handleSubmit, values, handleChange, errors }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <Layouts.Header
              primaryAction={
                !isLoadingPlugins ? (
                  <Button
                    disabled={role.code === 'strapi-super-admin'}
                    type="submit"
                    loading={mutation.isLoading}
                    startIcon={<Check />}
                  >
                    {formatMessage({
                      id: 'global.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                ) : null
              }
              title={role.name}
              subtitle={role.description}
              navigationAction={
                // The back link for mobile works differently; it is placed higher up in the DOM.
                <Box display={{ initial: 'none', medium: 'block' }}>
                  <BackButton fallback=".." />
                </Box>
              }
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
                <Flex direction="column" alignItems="stretch" gap={4}>
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
                            ? formatMessage({
                                id: errors.name,
                                defaultMessage: 'Name is required',
                              })
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
                        <TextInput type="text" value={values.name || ''} onChange={handleChange} />
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
                    permissions={role.permissions}
                    routes={routes}
                  />
                )}
              </Flex>
            </Layouts.Content>
          </Form>
        )}
      </Formik>
    </Page.Main>
  );
};

export const ProtectedRolesEditPage = () => (
  <Page.Protect permissions={PERMISSIONS.updateRole}>
    <EditPage />
  </Page.Protect>
);
