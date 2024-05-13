import * as React from 'react';

import { Box, Button, Flex, Main } from '@strapi/design-system';
import { Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { Navigate, useMatch } from 'react-router-dom';
import * as yup from 'yup';

import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { BackButton } from '../../../../features/BackButton';
import { useNotification } from '../../../../features/Notifications';
import { useTracking } from '../../../../features/Tracking';
import { useAdminRoles } from '../../../../hooks/useAdminRoles';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import {
  useGetRolePermissionLayoutQuery,
  useGetRolePermissionsQuery,
  useUpdateRoleMutation,
  useUpdateRolePermissionsMutation,
} from '../../../../services/users';
import { isBaseQueryError } from '../../../../utils/baseQuery';
import { translatedErrors } from '../../../../utils/translatedErrors';

import { Permissions, PermissionsAPI } from './components/Permissions';
import { RoleForm } from './components/RoleForm';

const EDIT_ROLE_SCHEMA = yup.object().shape({
  name: yup.string().required(translatedErrors.required.id),
  description: yup.string().optional(),
});

/**
 * TODO: be nice if we could just infer this from the schema
 */
interface EditRoleFormValues {
  name: string;
  description: string;
}

const EditPage = () => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const match = useMatch('/settings/roles/:id');
  const id = match?.params.id;
  const permissionsRef = React.useRef<PermissionsAPI>(null);
  const { trackUsage } = useTracking();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  const { isLoading: isLoadingPermissionsLayout, data: permissionsLayout } =
    useGetRolePermissionLayoutQuery({
      /**
       * Role here is a query param so if there's no role we pass an empty string
       * which returns us a default layout.
       */
      role: id ?? '',
    });

  const {
    roles,
    isLoading: isRoleLoading,
    refetch: refetchRole,
  } = useAdminRoles(
    { id },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const role = roles[0] ?? {};

  const { data: permissions, isLoading: isLoadingPermissions } = useGetRolePermissionsQuery(
    {
      id: id!,
    },
    {
      skip: !id,
      refetchOnMountOrArgChange: true,
    }
  );

  const [updateRole] = useUpdateRoleMutation();
  const [updateRolePermissions] = useUpdateRolePermissionsMutation();

  if (!id) {
    return <Navigate to="/settings/roles" />;
  }

  const handleEditRoleSubmit = async (
    data: EditRoleFormValues,
    formik: FormikHelpers<EditRoleFormValues>
  ) => {
    try {
      const { permissionsToSend, didUpdateConditions } =
        permissionsRef.current?.getPermissions() ?? {};

      const res = await updateRole({
        id,
        ...data,
      });

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

      if (role.code !== 'strapi-super-admin' && permissionsToSend) {
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

        if (didUpdateConditions) {
          trackUsage('didUpdateConditions');
        }
      }

      permissionsRef.current?.setFormAfterSubmit();

      await refetchRole();

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved' }),
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  const isFormDisabled = !isRoleLoading && role.code === 'strapi-super-admin';

  if (isLoadingPermissionsLayout || isRoleLoading || isLoadingPermissions || !permissionsLayout) {
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
        enableReinitialize
        initialValues={
          {
            name: role.name ?? '',
            description: role.description ?? '',
          } satisfies EditRoleFormValues
        }
        onSubmit={handleEditRoleSubmit}
        validationSchema={EDIT_ROLE_SCHEMA}
        validateOnChange={false}
      >
        {({ handleSubmit, values, errors, handleChange, handleBlur, isSubmitting }) => (
          <form onSubmit={handleSubmit}>
            <Layouts.Header
              primaryAction={
                <Flex gap={2}>
                  <Button
                    type="submit"
                    disabled={role.code === 'strapi-super-admin'}
                    loading={isSubmitting}
                    size="L"
                  >
                    {formatMessage({
                      id: 'global.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                </Flex>
              }
              title={formatMessage({
                id: 'Settings.roles.edit.title',
                defaultMessage: 'Edit a role',
              })}
              subtitle={formatMessage({
                id: 'Settings.roles.create.description',
                defaultMessage: 'Define the rights given to the role',
              })}
              navigationAction={<BackButton />}
            />
            <Layouts.Content>
              <Flex direction="column" alignItems="stretch" gap={6}>
                <RoleForm
                  disabled={isFormDisabled}
                  errors={errors}
                  values={values}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  role={role}
                />
                <Box shadow="filterShadow" hasRadius>
                  <Permissions
                    isFormDisabled={isFormDisabled}
                    permissions={permissions}
                    ref={permissionsRef}
                    layout={permissionsLayout}
                  />
                </Box>
              </Flex>
            </Layouts.Content>
          </form>
        )}
      </Formik>
    </Main>
  );
};

const ProtectedEditPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.roles.update
  );

  return (
    <Page.Protect permissions={permissions}>
      <EditPage />
    </Page.Protect>
  );
};

export { EditPage, ProtectedEditPage };
export type { EditRoleFormValues };
