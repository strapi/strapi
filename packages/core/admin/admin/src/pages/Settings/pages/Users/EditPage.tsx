import * as React from 'react';

import { Box, Button, Flex, Grid, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import pick from 'lodash/pick';
import { useIntl } from 'react-intl';
import { useMatch, useNavigate } from 'react-router-dom';
import * as yup from 'yup';

import { Update } from '../../../../../../shared/contracts/user';
import { Form, FormHelpers } from '../../../../components/Form';
import { InputRenderer } from '../../../../components/FormInputs/Renderer';
import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { BackButton } from '../../../../features/BackButton';
import { useNotification } from '../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { useRBAC } from '../../../../hooks/useRBAC';
import { selectAdminPermissions } from '../../../../selectors';
import { useAdminUsers, useUpdateUserMutation } from '../../../../services/users';
import { isBaseQueryError } from '../../../../utils/baseQuery';
import { translatedErrors } from '../../../../utils/translatedErrors';
import { getDisplayName } from '../../../../utils/users';

import { MagicLinkCE } from './components/MagicLinkCE';
import { SelectRoles } from './components/SelectRoles';
import { COMMON_USER_SCHEMA } from './utils/validation';

const EDIT_VALIDATION_SCHEMA = yup.object().shape({
  ...COMMON_USER_SCHEMA,
  isActive: yup.bool(),
  roles: yup
    .array()
    .min(1, {
      id: translatedErrors.required.id,
      defaultMessage: 'This field is required',
    })
    .required({
      id: translatedErrors.required.id,
      defaultMessage: 'This field is required',
    }),
});

const fieldsToPick = ['email', 'firstname', 'lastname', 'username', 'isActive', 'roles'] as const;

/* -------------------------------------------------------------------------------------------------
 * EditPage
 * -----------------------------------------------------------------------------------------------*/

const EditPage = () => {
  const { formatMessage } = useIntl();
  const match = useMatch('/settings/users/:id');
  const id = match?.params?.id ?? '';
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const MagicLink = useEnterprise(
    MagicLinkCE,
    async () =>
      (
        await import(
          '../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/components/MagicLinkEE'
        )
      ).MagicLinkEE
  );
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  const permissions = useTypedSelector(selectAdminPermissions);

  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canUpdate },
  } = useRBAC({
    read: permissions.settings?.users.read ?? [],
    update: permissions.settings?.users.update ?? [],
  });

  const [updateUser] = useUpdateUserMutation();

  const {
    data,
    error,
    isLoading: isLoadingAdminUsers,
  } = useAdminUsers(
    { id },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const [user] = data?.users ?? [];

  React.useEffect(() => {
    if (error) {
      // Redirect the user to the homepage if is not allowed to read
      if (error.name === 'UnauthorizedError') {
        toggleNotification({
          type: 'info',
          message: formatMessage({
            id: 'notification.permission.not-allowed-read',
            defaultMessage: 'You are not allowed to see this document',
          }),
        });

        navigate('/');
      } else {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(error),
        });
      }
    }
  }, [error, formatAPIError, formatMessage, navigate, toggleNotification]);

  const isLoading = isLoadingAdminUsers || !MagicLink || isLoadingRBAC;

  if (isLoading) {
    return <Page.Loading />;
  }

  type InitialData = Pick<Update.Request['body'], (typeof fieldsToPick)[number]> & {
    confirmPassword: string;
    password: string;
  };

  const initialData = {
    ...pick(user, fieldsToPick),
    roles: user.roles.map(({ id }) => id),
    password: '',
    confirmPassword: '',
  } satisfies InitialData;

  const handleSubmit = async (body: InitialData, actions: FormHelpers<InitialData>) => {
    const { confirmPassword: _confirmPassword, ...bodyRest } = body;

    const res = await updateUser({
      id,
      ...bodyRest,
    });

    if ('error' in res && isBaseQueryError(res.error)) {
      if (res.error.name === 'ValidationError') {
        actions.setErrors(formatValidationErrors(res.error));
      }

      toggleNotification({
        type: 'danger',
        message: formatAPIError(res.error),
      });
    } else {
      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
      });

      actions.setValues({
        ...pick(body, fieldsToPick),
        password: '',
        confirmPassword: '',
      });
    }
  };

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Users',
          }
        )}
      </Page.Title>
      <Form
        method="PUT"
        onSubmit={handleSubmit}
        initialValues={initialData}
        validationSchema={EDIT_VALIDATION_SCHEMA}
      >
        {({ isSubmitting, modified }) => {
          return (
            <>
              <Layouts.Header
                primaryAction={
                  <Button
                    disabled={isSubmitting || !canUpdate || !modified}
                    startIcon={<Check />}
                    loading={isSubmitting}
                    type="submit"
                    size="L"
                  >
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                }
                title={formatMessage(
                  {
                    id: 'app.containers.Users.EditPage.header.label',
                    defaultMessage: 'Edit {name}',
                  },
                  {
                    // @ts-expect-error – issues with the Entity ID type, still.
                    name: getDisplayName(initialData),
                  }
                )}
                navigationAction={<BackButton />}
              />
              <Layouts.Content>
                {user?.registrationToken && (
                  <Box paddingBottom={6}>
                    <MagicLink registrationToken={user.registrationToken} />
                  </Box>
                )}
                <Flex direction="column" alignItems="stretch" gap={7}>
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Typography variant="delta" tag="h2">
                        {formatMessage({
                          id: 'app.components.Users.ModalCreateBody.block-title.details',
                          defaultMessage: 'Details',
                        })}
                      </Typography>
                      <Grid.Root gap={5}>
                        {LAYOUT.map((row) =>
                          row.map(({ size, label, ...field }) => {
                            return (
                              <Grid.Item
                                key={field.name}
                                col={size}
                                direction="column"
                                alignItems="stretch"
                              >
                                <InputRenderer
                                  {...field}
                                  disabled={!canUpdate}
                                  label={formatMessage(label)}
                                  placeholder={
                                    'placeholder' in field
                                      ? formatMessage(field.placeholder)
                                      : undefined
                                  }
                                />
                              </Grid.Item>
                            );
                          })
                        )}
                      </Grid.Root>
                    </Flex>
                  </Box>
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Typography variant="delta" tag="h2">
                        {formatMessage({
                          id: 'global.roles',
                          defaultMessage: "User's role",
                        })}
                      </Typography>
                      <Grid.Root gap={5}>
                        <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                          <SelectRoles disabled={!canUpdate} />
                        </Grid.Item>
                      </Grid.Root>
                    </Flex>
                  </Box>
                </Flex>
              </Layouts.Content>
            </>
          );
        }}
      </Form>
    </Page.Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EditPage LAYOUT
 * -----------------------------------------------------------------------------------------------*/

const LAYOUT = [
  [
    {
      label: {
        id: 'Auth.form.firstname.label',
        defaultMessage: 'First name',
      },
      name: 'firstname',
      placeholder: {
        id: 'Auth.form.firstname.placeholder',
        defaultMessage: 'e.g. Kai',
      },
      type: 'string' as const,
      size: 6,
      required: true,
    },
    {
      label: {
        id: 'Auth.form.lastname.label',
        defaultMessage: 'Last name',
      },
      name: 'lastname',
      placeholder: {
        id: 'Auth.form.lastname.placeholder',
        defaultMessage: 'e.g. Doe',
      },
      type: 'string' as const,
      size: 6,
    },
  ],
  [
    {
      label: {
        id: 'Auth.form.email.label',
        defaultMessage: 'Email',
      },
      name: 'email',
      placeholder: {
        id: 'Auth.form.email.placeholder',
        defaultMessage: 'e.g. kai.doe@strapi.io',
      },
      type: 'email' as const,
      size: 6,
      required: true,
    },
    {
      label: {
        id: 'Auth.form.username.label',
        defaultMessage: 'Username',
      },
      name: 'username',
      placeholder: {
        id: 'Auth.form.username.placeholder',
        defaultMessage: 'e.g. Kai_Doe',
      },
      type: 'string' as const,
      size: 6,
    },
  ],
  [
    {
      autoComplete: 'new-password',
      label: {
        id: 'global.password',
        defaultMessage: 'Password',
      },
      name: 'password',
      type: 'password' as const,
      size: 6,
    },
    {
      autoComplete: 'new-password',
      label: {
        id: 'Auth.form.confirmPassword.label',
        defaultMessage: 'Password confirmation',
      },
      name: 'confirmPassword',
      type: 'password' as const,
      size: 6,
    },
  ],
  [
    {
      label: {
        id: 'Auth.form.active.label',
        defaultMessage: 'Active',
      },
      name: 'isActive',
      type: 'boolean' as const,
      size: 6,
    },
  ],
];

const ProtectedEditPage = () => {
  const permissions = useTypedSelector((state) => state.admin_app.permissions.settings?.users.read);

  return (
    <Page.Protect permissions={permissions}>
      <EditPage />
    </Page.Protect>
  );
};

export { EditPage, ProtectedEditPage };
