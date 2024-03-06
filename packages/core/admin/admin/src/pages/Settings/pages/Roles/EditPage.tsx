import * as React from 'react';

import { Box, Button, ContentLayout, Flex, HeaderLayout, Main } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import {
  useAPIErrorHandler,
  useNotification,
  useOverlayBlocker,
  useTracking,
  translatedErrors,
} from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { Formik, FormikHelpers } from 'formik';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { NavLink, Navigate, useMatch } from 'react-router-dom';
import * as yup from 'yup';

import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useAdminRoles } from '../../../../hooks/useAdminRoles';
import {
  useGetRolePermissionLayoutQuery,
  useGetRolePermissionsQuery,
  useUpdateRoleMutation,
  useUpdateRolePermissionsMutation,
} from '../../../../services/users';
import { isBaseQueryError } from '../../../../utils/baseQuery';

import { Permissions, PermissionsAPI } from './components/Permissions';
import { RoleForm } from './components/RoleForm';

const EDIT_ROLE_SCHEMA = yup.object().shape({
  name: yup.string().required(translatedErrors.required),
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
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const match = useMatch('/settings/roles/:id');
  const id = match?.params.id;
  const permissionsRef = React.useRef<PermissionsAPI>(null);
  const { lockApp, unlockApp } = useOverlayBlocker();
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
      // @ts-expect-error – This will be fixed in V5
      lockApp();

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
            type: 'warning',
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
              type: 'warning',
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
        message: { id: 'notification.success.saved' },
      });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    } finally {
      // @ts-expect-error – This will be fixed in V5
      unlockApp();
    }
  };

  const isFormDisabled = !isRoleLoading && role.code === 'strapi-super-admin';

  if (isLoadingPermissionsLayout || isRoleLoading || isLoadingPermissions || !permissionsLayout) {
    return <Page.Loading />;
  }

  return (
    <Main>
      <Helmet
        title={formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Roles',
          }
        )}
      />
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
            <HeaderLayout
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
            </ContentLayout>
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
