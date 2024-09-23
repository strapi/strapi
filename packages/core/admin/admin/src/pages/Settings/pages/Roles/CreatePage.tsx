import * as React from 'react';

import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Main,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { format } from 'date-fns';
import { Formik, Form, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { styled } from 'styled-components';
import * as yup from 'yup';

import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { BackButton } from '../../../../features/BackButton';
import { useNotification } from '../../../../features/Notifications';
import { useTracking } from '../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import {
  useCreateRoleMutation,
  useGetRolePermissionLayoutQuery,
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
} from '../../../../services/users';
import { isBaseQueryError } from '../../../../utils/baseQuery';
import { translatedErrors } from '../../../../utils/translatedErrors';

import { Permissions, PermissionsAPI } from './components/Permissions';

/* -------------------------------------------------------------------------------------------------
 * CreatePage
 * -----------------------------------------------------------------------------------------------*/

const CREATE_SCHEMA = yup.object().shape({
  name: yup.string().required(translatedErrors.required.id),
  description: yup.string().required(translatedErrors.required.id),
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
  const { id } = useParams();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const permissionsRef = React.useRef<PermissionsAPI>(null);
  const { trackUsage } = useTracking();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  const { isLoading: isLoadingPermissionsLayout, currentData: permissionsLayout } =
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
  const { currentData: rolePermissions, isLoading: isLoadingRole } = useGetRolePermissionsQuery(
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
            type: 'danger',
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
              type: 'danger',
              message: formatAPIError(updateRes.error),
            });
          }

          return;
        }
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'Settings.roles.created', defaultMessage: 'created' }),
      });

      navigate(`../roles/${res.data.id.toString()}`, { replace: true });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  if ((isLoadingPermissionsLayout && isLoadingRole) || !permissionsLayout) {
    return <Page.Loading />;
  }

  return (
    <Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Roles',
          }
        )}
      </Page.Title>
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
              <Layouts.Header
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
                navigationAction={<BackButton />}
              />
              <Layouts.Content>
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
                      <Grid.Root gap={4}>
                        <Grid.Item col={6} direction="column" alignItems="stretch">
                          <Field.Root
                            name="name"
                            error={errors.name && formatMessage({ id: errors.name })}
                            required
                          >
                            <Field.Label>
                              {formatMessage({
                                id: 'global.name',
                                defaultMessage: 'Name',
                              })}
                            </Field.Label>
                            <TextInput onChange={handleChange} value={values.name} />
                            <Field.Error />
                          </Field.Root>
                        </Grid.Item>
                        <Grid.Item col={6} direction="column" alignItems="stretch">
                          <Field.Root
                            name="description"
                            error={errors.description && formatMessage({ id: errors.description })}
                          >
                            <Field.Label>
                              {formatMessage({
                                id: 'global.description',
                                defaultMessage: 'Description',
                              })}
                            </Field.Label>
                            <Textarea onChange={handleChange} value={values.description} />
                          </Field.Root>
                        </Grid.Item>
                      </Grid.Root>
                    </Flex>
                  </Box>
                  <Box shadow="filterShadow" hasRadius>
                    <Permissions
                      isFormDisabled={false}
                      ref={permissionsRef}
                      permissions={rolePermissions}
                      layout={permissionsLayout}
                    />
                  </Box>
                </Flex>
              </Layouts.Content>
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
  font-size: 1.2rem;
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
    <Page.Protect permissions={permissions}>
      <CreatePage />
    </Page.Protect>
  );
};

export { CreatePage, ProtectedCreatePage };
