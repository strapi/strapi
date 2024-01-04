import * as React from 'react';

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
import { Link } from '@strapi/design-system/v2';
import {
  CheckPagePermissions,
  Form,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useNotification,
  useOverlayBlocker,
  useTracking,
  translatedErrors,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { format } from 'date-fns';
import { Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { NavLink, useHistory, useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import { useTypedSelector } from '../../../../core/store/hooks';
import {
  useCreateRoleMutation,
  useGetRolePermissionLayoutQuery,
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
} from '../../../../services/users';
import { isBaseQueryError } from '../../../../utils/baseQuery';

import { Permissions, PermissionsAPI } from './components/Permissions';

/* -------------------------------------------------------------------------------------------------
 * CreatePage
 * -----------------------------------------------------------------------------------------------*/

const CREATE_SCHEMA = yup.object().shape({
  name: yup.string().required(translatedErrors.required),
  description: yup.string().required(translatedErrors.required),
});

/**
 * TODO: be nice if we could just infer this from the schema
 */
interface CreateRoleFormValues {
  name: string;
  description: string;
}

/**
 * TODO: this whole section of the app needs refactoring. Using a ref to
 * manage the state of the child is nonsensical.
 */
const CreatePage = () => {
  const match = useRouteMatch<{ id: string }>('/settings/roles/duplicate/:id');
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { formatMessage } = useIntl();
  const { replace } = useHistory();
  const permissionsRef = React.useRef<PermissionsAPI>(null);
  const { trackUsage } = useTracking();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  const id = match?.params.id ?? null;

  const { isLoading: isLoadingPermissionsLayout, data: permissionsLayout } =
    useGetRolePermissionLayoutQuery({
      /**
       * Role here is a query param so if there's no role we pass an empty string
       * which returns us a default layout.
       */
      role: id ?? '',
    });

  /**
   * We need this so if we're cloning a role, we can fetch
   * the current permissions that role has.
   */
  const { data: rolePermissions, isLoading: isLoadingRole } = useGetRolePermissionsQuery(
    {
      id: id!,
    },
    {
      skip: !id,
      refetchOnMountOrArgChange: true,
    }
  );

  const [createRole] = useCreateRoleMutation();
  const [updateRolePermissions] = useUpdateRolePermissionsMutation();

  const handleCreateRoleSubmit = async (
    data: CreateRoleFormValues,
    formik: FormikHelpers<CreateRoleFormValues>
  ) => {
    try {
      // @ts-expect-error – fixed in V5
      lockApp();

      if (id) {
        trackUsage('willDuplicateRole');
      } else {
        trackUsage('willCreateNewRole');
      }

      const res = await createRole(data);

      if ('error' in res) {
        if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
          formik.setErrors(formatValidationErrors(res.error));
        } else {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(res.error),
          });
        }

        return;
      }

      const { permissionsToSend } = permissionsRef.current?.getPermissions() ?? {};

      if (res.data.id && Array.isArray(permissionsToSend) && permissionsToSend.length > 0) {
        const updateRes = await updateRolePermissions({
          id: res.data.id,
          permissions: permissionsToSend,
        });

        if ('error' in updateRes) {
          if (isBaseQueryError(updateRes.error) && updateRes.error.name === 'ValidationError') {
            formik.setErrors(formatValidationErrors(updateRes.error));
          } else {
            toggleNotification({
              type: 'warning',
              message: formatAPIError(updateRes.error),
            });
          }

          return;
        }
      }

      toggleNotification({
        type: 'success',
        message: { id: 'Settings.roles.created', defaultMessage: 'created' },
      });

      replace(`/settings/roles/${res.data.id}`);
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    } finally {
      // @ts-expect-error – fixed in V5
      unlockApp();
    }
  };

  return (
    <Main>
      <SettingsPageTitle name="Roles" />
      <Formik
        initialValues={
          {
            name: '',
            description: `${formatMessage({
              id: 'Settings.roles.form.created',
              defaultMessage: 'Created',
            })} ${format(new Date(), 'PPP')}`,
          } satisfies CreateRoleFormValues
        }
        onSubmit={handleCreateRoleSubmit}
        validationSchema={CREATE_SCHEMA}
        validateOnChange={false}
      >
        {({ values, errors, handleReset, handleChange, isSubmitting }) => (
          <Form>
            <>
              <HeaderLayout
                primaryAction={
                  <Flex gap={2}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        handleReset();
                        permissionsRef.current?.resetForm();
                      }}
                      size="L"
                    >
                      {formatMessage({
                        id: 'app.components.Button.reset',
                        defaultMessage: 'Reset',
                      })}
                    </Button>
                    <Button type="submit" loading={isSubmitting} size="L">
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
                  // @ts-expect-error – the props from the component passed as `as` are not correctly inferred.
                  <Link as={NavLink} startIcon={<ArrowLeft />} to="/settings/roles">
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
                  {!isLoadingPermissionsLayout && !isLoadingRole && permissionsLayout ? (
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

const UsersRoleNumber = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.primary200};
  background: ${({ theme }) => theme.colors.primary100};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  color: ${({ theme }) => theme.colors.primary600};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${12 / 16}rem;
  font-weight: bold;
`;

/* -------------------------------------------------------------------------------------------------
 * ProtectedCreatePage
 * -----------------------------------------------------------------------------------------------*/

const ProtectedCreatePage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.roles.create
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <CreatePage />
    </CheckPagePermissions>
  );
};

export { CreatePage, ProtectedCreatePage };
