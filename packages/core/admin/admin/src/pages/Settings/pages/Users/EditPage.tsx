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
  Typography,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import {
  auth,
  Form,
  GenericInput,
  LoadingIndicatorPage,
  SettingsPageTitle,
  translatedErrors,
  useAPIErrorHandler,
  useAppInfo,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
} from '@strapi/helper-plugin';
import { ArrowLeft, Check } from '@strapi/icons';
import { AxiosError } from 'axios';
import { Formik, FormikErrors, FormikHelpers } from 'formik';
import get from 'lodash/get';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { useIntl } from 'react-intl';
import { NavLink, Redirect, useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import * as yup from 'yup';

import { Update } from '../../../../../../shared/contracts/user';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useAdminUsers } from '../../../../hooks/useAdminUsers';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { selectAdminPermissions } from '../../../../selectors';
import { formatAPIErrors } from '../../../../utils/formatAPIErrors';
import { getFullName } from '../../../../utils/getFullName';

import { MagicLinkCE } from './components/MagicLinkCE';
import { SelectRoles } from './components/SelectRoles';
import { COMMON_USER_SCHEMA } from './utils/validation';

import type { FormLayout } from '../../../../types/form';

const EDIT_VALIDATION_SCHEMA = yup.object().shape({
  ...COMMON_USER_SCHEMA,
  isActive: yup.bool(),
  roles: yup.array().min(1, translatedErrors.required).required(translatedErrors.required),
});

const fieldsToPick = ['email', 'firstname', 'lastname', 'username', 'isActive', 'roles'] as const;

/* -------------------------------------------------------------------------------------------------
 * EditPage
 * -----------------------------------------------------------------------------------------------*/

const EditPage = () => {
  const { put } = useFetchClient();
  const { formatMessage } = useIntl();
  const match = useRouteMatch<{ id: string }>('/settings/users/:id');
  const id = match?.params?.id ?? '';
  const { push } = useHistory();
  const { setUserDisplayName } = useAppInfo();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const MagicLink = useEnterprise(
    MagicLinkCE,
    async () =>
      (
        await import(
          '../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/components/MagicLinkEE'
        )
      ).MagicLinkEE
  );
  const { formatAPIError } = useAPIErrorHandler();

  const permissions = useTypedSelector(selectAdminPermissions);

  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canUpdate },
  } = useRBAC({
    read: permissions.settings?.users.read ?? [],
    update: permissions.settings?.users.update ?? [],
  });

  useFocusWhenNavigate();

  const {
    users: [user],
    isLoading: isLoadingAdminUsers,
  } = useAdminUsers(
    { id },
    {
      cacheTime: 0,
      onError(error) {
        const { status } = error.response ?? {};

        // Redirect the use to the homepage if is not allowed to read
        if (status === 403) {
          toggleNotification({
            type: 'info',
            message: {
              id: 'notification.permission.not-allowed-read',
              defaultMessage: 'You are not allowed to see this document',
            },
          });

          push('/');
        } else {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error', defaultMessage: 'An error occured' },
          });
        }
      },
    }
  );

  const isLoading = isLoadingAdminUsers || !MagicLink || isLoadingRBAC;

  if (isLoading) {
    return (
      <Main aria-busy="true">
        <SettingsPageTitle name="Users" />
        <HeaderLayout
          primaryAction={
            <Button disabled startIcon={<Check />} type="button" size="L">
              {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
            </Button>
          }
          title={formatMessage({
            id: 'app.containers.Users.EditPage.header.label-loading',
            defaultMessage: 'Edit user',
          })}
          navigationAction={
            <Link
              as={NavLink}
              startIcon={<ArrowLeft />}
              // @ts-expect-error – as component props are not inferred correctly.
              to="/settings/users?pageSize=10&page=1&sort=firstname"
            >
              {formatMessage({
                id: 'global.back',
                defaultMessage: 'Back',
              })}
            </Link>
          }
        />
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
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

  /**
   * TODO: Convert this to react-query.
   */
  const handleSubmit = async (body: InitialData, actions: FormikHelpers<InitialData>) => {
    lockApp?.();

    try {
      const {
        data: { data },
      } = await put<Update.Response>(`/admin/users/${id}`, omit(body, 'confirmPassword'));

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
      });

      const userInfos = auth.getUserInfo();

      // The user is updating himself
      if (id.toString() === userInfos?.id.toString()) {
        auth.setUserInfo(data);

        const userDisplayName =
          get(body, 'username') || getFullName(body?.firstname ?? '', body.lastname);

        setUserDisplayName(userDisplayName);
      }
      actions.setValues({
        ...pick(body, fieldsToPick),
        password: '',
        confirmPassword: '',
      });
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
        // FIXME when API errors are ready
        const errors = formatAPIErrors(err.response.data);
        const fieldsErrors = Object.keys(errors).reduce<FormikErrors<InitialData>>(
          (acc, current) => {
            acc[current as keyof InitialData] = errors[current].id;

            return acc;
          },
          {}
        );

        actions.setErrors(fieldsErrors);
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      }
    }

    unlockApp?.();
  };

  return (
    <Main>
      <SettingsPageTitle name="Users" />
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialData}
        validateOnChange={false}
        validationSchema={EDIT_VALIDATION_SCHEMA}
      >
        {({ errors, values, handleChange, isSubmitting, dirty }) => {
          return (
            <Form>
              <HeaderLayout
                primaryAction={
                  <Button
                    disabled={isSubmitting || !canUpdate ? true : !dirty}
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
                    name:
                      initialData.username ||
                      getFullName(initialData?.firstname ?? '', initialData.lastname),
                  }
                )}
                navigationAction={
                  <Link
                    as={NavLink}
                    startIcon={<ArrowLeft />}
                    // @ts-expect-error – as component props are not inferred correctly.
                    to="/settings/users?pageSize=10&page=1&sort=firstname"
                  >
                    {formatMessage({
                      id: 'global.back',
                      defaultMessage: 'Back',
                    })}
                  </Link>
                }
              />
              <ContentLayout>
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
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: 'app.components.Users.ModalCreateBody.block-title.details',
                          defaultMessage: 'Details',
                        })}
                      </Typography>
                      <Grid gap={5}>
                        {LAYOUT.map((row) =>
                          row.map((input) => {
                            return (
                              <GridItem key={input.name} {...input.size}>
                                <GenericInput
                                  {...input}
                                  disabled={!canUpdate}
                                  // TODO: remove this coercion.
                                  error={errors[input.name as keyof typeof errors] as string}
                                  onChange={handleChange}
                                  value={values[input.name as keyof typeof values]}
                                />
                              </GridItem>
                            );
                          })
                        )}
                      </Grid>
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
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: 'global.roles',
                          defaultMessage: "User's role",
                        })}
                      </Typography>
                      <Grid gap={5}>
                        <GridItem col={6} xs={12}>
                          <SelectRoles
                            disabled={!canUpdate}
                            error={errors.roles as string}
                            onChange={handleChange}
                            value={values.roles}
                          />
                        </GridItem>
                      </Grid>
                    </Flex>
                  </Box>
                </Flex>
              </ContentLayout>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EditPage LAYOUT
 * -----------------------------------------------------------------------------------------------*/

const LAYOUT = [
  [
    {
      intlLabel: {
        id: 'Auth.form.firstname.label',
        defaultMessage: 'First name',
      },
      name: 'firstname',
      placeholder: {
        id: 'Auth.form.firstname.placeholder',
        defaultMessage: 'e.g. Kai',
      },
      type: 'text',
      size: {
        col: 6,
        xs: 12,
      },
      required: true,
    },
    {
      intlLabel: {
        id: 'Auth.form.lastname.label',
        defaultMessage: 'Last name',
      },
      name: 'lastname',
      placeholder: {
        id: 'Auth.form.lastname.placeholder',
        defaultMessage: 'e.g. Doe',
      },
      type: 'text',
      size: {
        col: 6,
        xs: 12,
      },
    },
  ],
  [
    {
      intlLabel: {
        id: 'Auth.form.email.label',
        defaultMessage: 'Email',
      },
      name: 'email',
      placeholder: {
        id: 'Auth.form.email.placeholder',
        defaultMessage: 'e.g. kai.doe@strapi.io',
      },
      type: 'email',
      size: {
        col: 6,
        xs: 12,
      },
      required: true,
    },
    {
      intlLabel: {
        id: 'Auth.form.username.label',
        defaultMessage: 'Username',
      },
      name: 'username',
      placeholder: {
        id: 'Auth.form.username.placeholder',
        defaultMessage: 'e.g. Kai_Doe',
      },
      type: 'text',
      size: {
        col: 6,
        xs: 12,
      },
    },
  ],
  [
    {
      intlLabel: {
        id: 'global.password',
        defaultMessage: 'Password',
      },
      name: 'password',
      type: 'password',
      size: {
        col: 6,
        xs: 12,
      },
      autoComplete: 'new-password',
    },
    {
      intlLabel: {
        id: 'Auth.form.confirmPassword.label',
        defaultMessage: 'Password confirmation',
      },
      name: 'confirmPassword',
      type: 'password',
      size: {
        col: 6,
        xs: 12,
      },
      autoComplete: 'new-password',
    },
  ],
  [
    {
      intlLabel: {
        id: 'Auth.form.active.label',
        defaultMessage: 'Active',
      },
      name: 'isActive',
      type: 'bool',
      size: {
        col: 6,
        xs: 12,
      },
    },
  ],
] satisfies FormLayout[][];

const ProtectedEditPage = () => {
  const toggleNotification = useNotification();
  const permissions = useTypedSelector(selectAdminPermissions);

  const {
    isLoading,
    allowedActions: { canRead, canUpdate },
  } = useRBAC({
    read: permissions.settings?.users.read ?? [],
    update: permissions.settings?.users.update ?? [],
  });
  const { state } = useLocation<{ from: string }>();
  const from = state?.from ?? '/';

  React.useEffect(() => {
    if (!isLoading) {
      if (!canRead && !canUpdate) {
        toggleNotification({
          type: 'info',
          message: {
            id: 'notification.permission.not-allowed-read',
            defaultMessage: 'You are not allowed to see this document',
          },
        });
      }
    }
  }, [isLoading, canRead, canUpdate, toggleNotification]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!canRead && !canUpdate) {
    return <Redirect to={from} />;
  }

  return <EditPage />;
};

export { EditPage, ProtectedEditPage };
