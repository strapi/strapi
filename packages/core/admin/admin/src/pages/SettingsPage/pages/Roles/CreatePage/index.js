import React, { useRef, useState } from 'react';

import {
  Box,
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
  Link,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useFetchClient,
  useNotification,
  useOverlayBlocker,
  useTracking,
} from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { format } from 'date-fns';
import { Formik } from 'formik';
import isEmpty from 'lodash/isEmpty';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useHistory, useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';

import { selectAdminPermissions } from '../../../../App/selectors';
import Permissions from '../EditPage/components/Permissions';
import { useAdminRolePermissionLayout } from '../hooks/useAdminRolePermissionLayout';
import { useAdminRolePermissions } from '../hooks/useAdminRolePermissions';

import schema from './utils/schema';

const UsersRoleNumber = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.primary200};
  background: ${({ theme }) => theme.colors.primary100};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  color: ${({ theme }) => theme.colors.primary600};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${12 / 16}rem;
  font-weight: bold;
`;

const CreatePage = () => {
  const route = useRouteMatch('/settings/roles/duplicate/:id');
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { formatMessage } = useIntl();
  const [isSubmitting, setIsSubmiting] = useState(false);
  const { replace } = useHistory();
  const permissionsRef = useRef();
  const { trackUsage } = useTracking();
  const { post, put } = useFetchClient();

  const { params } = route ?? {};

  const { isLoading: isLoadingPermissionsLayout, data: permissionsLayout } =
    useAdminRolePermissionLayout(params?.id, {
      cacheTime: 0,
    });

  const { permissions: rolePermissions, isLoading: isLoadingRole } = useAdminRolePermissions(
    { id: params?.id },
    {
      cacheTime: 0,

      // only fetch permissions if a role is cloned
      enabled: !!params?.id,
    }
  );

  const handleCreateRoleSubmit = (data) => {
    lockApp();
    setIsSubmiting(true);

    if (params?.id) {
      trackUsage('willDuplicateRole');
    } else {
      trackUsage('willCreateNewRole');
    }

    Promise.resolve(post('/admin/roles', data))
      .then(async ({ data: res }) => {
        const { permissionsToSend } = permissionsRef.current.getPermissions();

        if (params?.id) {
          trackUsage('didDuplicateRole');
        } else {
          trackUsage('didCreateNewRole');
        }

        if (res.data.id && !isEmpty(permissionsToSend)) {
          await put(`/admin/roles/${res.data.id}/permissions`, { permissions: permissionsToSend });
        }

        return res;
      })
      .then((res) => {
        setIsSubmiting(false);
        toggleNotification({
          type: 'success',
          message: { id: 'Settings.roles.created', defaultMessage: 'created' },
        });
        replace(`/settings/roles/${res.data.id}`);
      })
      .catch((err) => {
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

  const defaultDescription = `${formatMessage({
    id: 'Settings.roles.form.created',
    defaultMessage: 'Created',
  })} ${format(new Date(), 'PPP')}`;

  return (
    <Main>
      <SettingsPageTitle name="Roles" />
      <Formik
        initialValues={{ name: '', description: defaultDescription }}
        onSubmit={handleCreateRoleSubmit}
        validationSchema={schema}
        validateOnChange={false}
      >
        {({ handleSubmit, values, errors, handleReset, handleChange }) => (
          <Form noValidate>
            <>
              <HeaderLayout
                primaryAction={
                  <Flex gap={2}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        handleReset();
                        permissionsRef.current.resetForm();
                      }}
                      size="L"
                    >
                      {formatMessage({
                        id: 'app.components.Button.reset',
                        defaultMessage: 'Reset',
                      })}
                    </Button>
                    <Button onClick={handleSubmit} loading={isSubmitting} size="L">
                      {formatMessage({
                        id: 'global.save',
                        defaultMessage: 'Save',
                      })}
                    </Button>
                  </Flex>
                }
                title={formatMessage({
                  id: 'Settings.roles.create.title',
                  defaultMessage: 'Create a role',
                })}
                subtitle={formatMessage({
                  id: 'Settings.roles.create.description',
                  defaultMessage: 'Define the rights given to the role',
                })}
                navigationAction={
                  <Link startIcon={<ArrowLeft />} to="/settings/roles">
                    {formatMessage({
                      id: 'global.back',
                      defaultMessage: 'Back',
                    })}
                  </Link>
                }
              />
              <ContentLayout>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Flex justifyContent="space-between">
                        <Box>
                          <Box>
                            <Typography fontWeight="bold">
                              {formatMessage({
                                id: 'global.details',
                                defaultMessage: 'Details',
                              })}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="pi" textColor="neutral600">
                              {formatMessage({
                                id: 'Settings.roles.form.description',
                                defaultMessage: 'Name and description of the role',
                              })}
                            </Typography>
                          </Box>
                        </Box>
                        <UsersRoleNumber>
                          {formatMessage(
                            {
                              id: 'Settings.roles.form.button.users-with-role',
                              defaultMessage:
                                '{number, plural, =0 {# users} one {# user} other {# users}} with this role',
                            },
                            { number: 0 }
                          )}
                        </UsersRoleNumber>
                      </Flex>
                      <Grid gap={4}>
                        <GridItem col={6}>
                          <TextInput
                            name="name"
                            error={errors.name && formatMessage({ id: errors.name })}
                            label={formatMessage({
                              id: 'global.name',
                              defaultMessage: 'Name',
                            })}
                            onChange={handleChange}
                            required
                            value={values.name}
                          />
                        </GridItem>
                        <GridItem col={6}>
                          <Textarea
                            label={formatMessage({
                              id: 'global.description',
                              defaultMessage: 'Description',
                            })}
                            id="description"
                            error={errors.description && formatMessage({ id: errors.description })}
                            onChange={handleChange}
                          >
                            {values.description}
                          </Textarea>
                        </GridItem>
                      </Grid>
                    </Flex>
                  </Box>
                  {!isLoadingPermissionsLayout && !isLoadingRole ? (
                    <Box shadow="filterShadow" hasRadius>
                      <Permissions
                        isFormDisabled={false}
                        ref={permissionsRef}
                        permissions={rolePermissions}
                        layout={permissionsLayout}
                      />
                    </Box>
                  ) : (
                    <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                      <LoadingIndicatorPage />
                    </Box>
                  )}
                </Flex>
              </ContentLayout>
            </>
          </Form>
        )}
      </Formik>
    </Main>
  );
};

export default function () {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings.roles.create}>
      <CreatePage />
    </CheckPagePermissions>
  );
}

export { CreatePage };
