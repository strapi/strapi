import * as React from 'react';

import {
  ContentLayout,
  HeaderLayout,
  Main,
  Button,
  Flex,
  TextInput,
  Textarea,
  Typography,
  GridItem,
  Grid,
} from '@strapi/design-system';
import {
  useFetchClient,
  useOverlayBlocker,
  SettingsPageTitle,
  LoadingIndicatorPage,
  Form,
  useFormatAPIError,
  useNotification,
  Link,
} from '@strapi/helper-plugin';
import { ArrowLeft, Check } from '@strapi/icons';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useRouteMatch } from 'react-router-dom';

import UsersPermissions from '../../../components/UsersPermissions';
import { usePlugins, useFetchRole } from '../../../hooks';
import getTrad from '../../../utils/getTrad';
import { createRoleSchema } from '../constants';

export const EditPage = () => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const {
    params: { id },
  } = useRouteMatch(`/settings/users-permissions/roles/:id`);
  const { isLoading: isLoadingPlugins, routes } = usePlugins();
  const { role, onSubmitSucceeded, isLoading: isLoadingRole } = useFetchRole(id);
  const permissionsRef = React.useRef();
  const { put } = useFetchClient();
  const { formatAPIError } = useFormatAPIError();
  const mutation = useMutation((body) => put(`/users-permissions/roles/${id}`, body), {
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    },

    onSuccess(data) {
      toggleNotification({
        type: 'success',
        message: {
          id: getTrad('Settings.roles.created'),
          defaultMessage: 'Role edited',
        },
      });

      onSubmitSucceeded({ name: data.name, description: data.description });
    },
  });

  const handleEditRoleSubmit = async (data) => {
    // Set loading state
    lockApp();

    const permissions = permissionsRef.current.getPermissions();

    await mutation.mutate({ ...data, ...permissions, users: [] });

    unlockApp();
  };

  if (isLoadingRole) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main>
      {/* TODO: this needs to be translated */}
      <SettingsPageTitle name="Roles" />
      <Formik
        enableReinitialize
        initialValues={{ name: role.name, description: role.description }}
        onSubmit={handleEditRoleSubmit}
        validationSchema={createRoleSchema}
      >
        {({ handleSubmit, values, handleChange, errors }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <HeaderLayout
              primaryAction={
                !isLoadingPlugins && (
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
                )
              }
              title={role.name}
              subtitle={role.description}
              navigationAction={
                <Link startIcon={<ArrowLeft />} to="/settings/users-permissions/roles">
                  {formatMessage({
                    id: 'global.back',
                    defaultMessage: 'Back',
                  })}
                </Link>
              }
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
                <Flex direction="column" alignItems="stretch" gap={4}>
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
                        error={errors?.name ?? false}
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
                        error={errors?.description ?? false}
                      />
                    </GridItem>
                  </Grid>
                </Flex>

                {!isLoadingPlugins && (
                  <UsersPermissions
                    ref={permissionsRef}
                    permissions={role.permissions}
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
