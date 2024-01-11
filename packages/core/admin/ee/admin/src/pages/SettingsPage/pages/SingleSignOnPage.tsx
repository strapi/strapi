import {
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Layout,
  Main,
  MultiSelect,
  MultiSelectOption,
  Option,
  Select,
  ToggleInput,
  Typography,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  Form,
  LoadingIndicatorPage,
  SettingsPageTitle,
  translatedErrors,
  useAPIErrorHandler,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { useTypedSelector } from '../../../../../../admin/src/core/store/hooks';
import { useAdminRoles } from '../../../../../../admin/src/hooks/useAdminRoles';
import {
  useGetProviderOptionsQuery,
  useUpdateProviderOptionsMutation,
} from '../../../../../../admin/src/services/auth';
import { isBaseQueryError } from '../../../../../../admin/src/utils/baseQuery';
import { ProvidersOptions } from '../../../../../../shared/contracts/admin';

const schema = yup.object().shape({
  autoRegister: yup.bool().required(translatedErrors.required),
  defaultRole: yup.mixed().when('autoRegister', (value, initSchema) => {
    return value ? initSchema.required(translatedErrors.required) : initSchema.nullable();
  }),
  ssoLockedRoles: yup
    .array()
    .nullable()
    .of(
      yup.mixed().when('ssoLockedRoles', (value, initSchema) => {
        return value ? initSchema.required(translatedErrors.required) : initSchema.nullable();
      })
    ),
});

export const SingleSignOnPage = () => {
  useFocusWhenNavigate();

  const { formatMessage } = useIntl();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  const { isLoading: isLoadingProviderOptions, data } = useGetProviderOptionsQuery();

  const [updateProviderOptions, { isLoading: isSubmittingForm }] =
    useUpdateProviderOptionsMutation();

  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate, canReadRoles },
  } = useRBAC({
    ...permissions.settings?.sso,
    readRoles: permissions.settings?.roles.read ?? [],
  });

  const { roles, isLoading: isLoadingRoles } = useAdminRoles(undefined, {
    skip: !canReadRoles,
  });

  const handleSubmit = async (
    body: ProvidersOptions.Request['body'],
    formik: FormikHelpers<ProvidersOptions.Request['body']>
  ) => {
    // @ts-expect-error - context assertation
    lockApp();

    try {
      const res = await updateProviderOptions(body);

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

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved' },
      });
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred, please try again.',
        },
      });
    } finally {
      // @ts-expect-error - context assertation
      unlockApp();
    }
  };

  const isLoadingData = isLoadingRoles || isLoadingPermissions || isLoadingProviderOptions;

  return (
    <Layout>
      <SettingsPageTitle name="SSO" />
      <Main aria-busy={isSubmittingForm || isLoadingData} tabIndex={-1}>
        <Formik
          onSubmit={handleSubmit}
          initialValues={
            data || {
              autoRegister: false,
              defaultRole: null,
              ssoLockedRoles: null,
            }
          }
          validationSchema={schema}
          validateOnChange={false}
          enableReinitialize
        >
          {({ handleChange, isSubmitting, values, setFieldValue, dirty, errors }) => (
            <Form>
              <HeaderLayout
                primaryAction={
                  <Button
                    disabled={!dirty}
                    loading={isSubmitting}
                    startIcon={<Check />}
                    type="submit"
                    size="L"
                  >
                    {formatMessage({
                      id: 'global.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                }
                title={formatMessage({
                  id: 'Settings.sso.title',
                  defaultMessage: 'Single Sign-On',
                })}
                subtitle={formatMessage({
                  id: 'Settings.sso.description',
                  defaultMessage: 'Configure the settings for the Single Sign-On feature.',
                })}
              />
              <ContentLayout>
                {isSubmitting || isLoadingData ? (
                  <LoadingIndicatorPage />
                ) : (
                  <Flex
                    direction="column"
                    alignItems="stretch"
                    gap={4}
                    background="neutral0"
                    padding={6}
                    shadow="filterShadow"
                    hasRadius
                  >
                    <Typography variant="delta" as="h2">
                      {formatMessage({
                        id: 'global.settings',
                        defaultMessage: 'Settings',
                      })}
                    </Typography>
                    <Grid gap={4}>
                      <GridItem col={6} s={12}>
                        <ToggleInput
                          disabled={!canUpdate}
                          checked={values.autoRegister}
                          hint={formatMessage({
                            id: 'Settings.sso.form.registration.description',
                            defaultMessage: 'Create new user on SSO login if no account exists',
                          })}
                          label={formatMessage({
                            id: 'Settings.sso.form.registration.label',
                            defaultMessage: 'Auto-registration',
                          })}
                          name="autoRegister"
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={handleChange}
                        />
                      </GridItem>
                      <GridItem col={6} s={12}>
                        <Select
                          disabled={!canUpdate}
                          hint={formatMessage({
                            id: 'Settings.sso.form.defaultRole.description',
                            defaultMessage:
                              'It will attach the new authenticated user to the selected role',
                          })}
                          error={
                            errors.defaultRole
                              ? formatMessage({
                                  id: errors.defaultRole,
                                  defaultMessage: errors.defaultRole,
                                })
                              : ''
                          }
                          label={formatMessage({
                            id: 'Settings.sso.form.defaultRole.label',
                            defaultMessage: 'Default role',
                          })}
                          name="defaultRole"
                          onChange={(value) =>
                            handleChange({ target: { name: 'defaultRole', value } })
                          }
                          placeholder={formatMessage({
                            id: 'components.InputSelect.option.placeholder',
                            defaultMessage: 'Choose here',
                          })}
                          value={values.defaultRole}
                        >
                          {roles.map(({ id, name }) => (
                            <Option key={id} value={id.toString()}>
                              {name}
                            </Option>
                          ))}
                        </Select>
                      </GridItem>
                      <GridItem col={6} s={12}>
                        <MultiSelect
                          disabled={!canUpdate}
                          hint={formatMessage({
                            id: 'Settings.sso.form.localAuthenticationLock.description',
                            defaultMessage:
                              'Select the roles for which you want to disable the local authentication',
                          })}
                          error={
                            errors.ssoLockedRoles
                              ? formatMessage({
                                  id: errors.ssoLockedRoles,
                                  defaultMessage: errors.ssoLockedRoles,
                                })
                              : ''
                          }
                          label={formatMessage({
                            id: 'Settings.sso.form.localAuthenticationLock.label',
                            defaultMessage: 'Local authentication lock-out',
                          })}
                          name="ssoLockedRoles"
                          onChange={(value) =>
                            handleChange({
                              target: {
                                value,
                                name: 'ssoLockedRoles',
                              },
                            })
                          }
                          placeholder={formatMessage({
                            id: 'components.InputSelect.option.placeholder',
                            defaultMessage: 'Choose here',
                          })}
                          onClear={() => setFieldValue('ssoLockedRoles', [])}
                          value={values.ssoLockedRoles || []}
                          withTags
                        >
                          {roles.map(({ id, name }) => (
                            <MultiSelectOption key={id} value={id.toString()}>
                              {name}
                            </MultiSelectOption>
                          ))}
                        </MultiSelect>
                      </GridItem>
                    </Grid>
                  </Flex>
                )}
              </ContentLayout>
            </Form>
          )}
        </Formik>
      </Main>
    </Layout>
  );
};

export const ProtectedSSO = () => {
  const permissions = useTypedSelector((state) => state.admin_app.permissions.settings?.sso?.main);

  return (
    <CheckPagePermissions permissions={permissions}>
      <SingleSignOnPage />
    </CheckPagePermissions>
  );
};
