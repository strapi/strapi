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
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { AxiosError } from 'axios';
import { Formik, FormikErrors, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import * as yup from 'yup';

import { useAdminRoles } from '../../../../../../admin/src/hooks/useAdminRoles';
import { selectAdminPermissions } from '../../../../../../admin/src/selectors';
import { formatAPIErrors } from '../../../../../../admin/src/utils/formatAPIErrors';
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
  const permissions = useSelector(selectAdminPermissions);
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();

  const { get, put } = useFetchClient();

  const { isLoading: isLoadingProviderOptions, data } = useQuery(
    ['providers', 'options'],
    async () => {
      const { data } = await get<ProvidersOptions.Response>('/admin/providers/options');

      return data.data;
    },
    {
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const submitMutation = useMutation<
    ProvidersOptions.Response['data'],
    AxiosError<ProvidersOptions.Response>,
    ProvidersOptions.Request['body']
  >(
    async (body) => {
      const { autoRegister, defaultRole, ssoLockedRoles } = body;
      const { data } = await put<ProvidersOptions.Response>('/admin/providers/options', {
        autoRegister,
        defaultRole,
        ssoLockedRoles,
      });

      return data.data;
    },
    {
      async onSettled() {
        // @ts-expect-error – we're going to implement a context assertion to avoid this
        unlockApp();
      },
    }
  );

  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate, canReadRoles },
  } = useRBAC({
    ...permissions.settings?.sso,
    readRoles: permissions.settings?.roles.read ?? [],
  });

  const { roles, isLoading: isLoadingRoles } = useAdminRoles(undefined, {
    enabled: canReadRoles,
  });

  const handleSubmit = async (
    body: ProvidersOptions.Request['body'],
    { resetForm, setErrors }: FormikHelpers<ProvidersOptions.Request['body']>
  ) => {
    // @ts-expect-error - context assertation
    lockApp();

    submitMutation.mutate(body, {
      onSuccess(data) {
        resetForm({ values: data });
        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.saved' },
        });
      },
      onError(err) {
        if (err instanceof AxiosError && err.response) {
          // @ts-expect-error formatApiErrors is waiting for a Record<string, string[]> while response.data contains different value types than string.
          const errors = formatAPIErrors(err.response.data);
          const fieldsErrors = Object.keys(errors).reduce<
            FormikErrors<ProvidersOptions.Request['body']>
          >((acc, current) => {
            acc[current as keyof ProvidersOptions.Request['body']] = errors[current].id;
            return acc;
          }, {});
          setErrors(fieldsErrors);
          toggleNotification({
            type: 'warning',
            // @ts-expect-error formatAPIError is waiting for "err" to be AxiosError<{ error: ApiError }> while few lines above we need error.data there's a conflict between these two functions
            message: formatAPIError(err),
          });
        }
      },
    });
  };

  const { isLoading: isSubmittingForm } = submitMutation;
  const initialValues = {
    autoRegister: false,
    defaultRole: null,
    ssoLockedRoles: null,
  };
  const isLoadingData = isLoadingRoles || isLoadingPermissions || isLoadingProviderOptions;
  return (
    <Layout>
      <SettingsPageTitle name="SSO" />
      <Main aria-busy={isSubmittingForm || isLoadingData} tabIndex={-1}>
        <Formik
          onSubmit={handleSubmit}
          initialValues={data || initialValues}
          validationSchema={schema}
          validateOnChange={false}
          enableReinitialize
        >
          {({ handleChange, isSubmitting, values, setFieldValue, dirty, errors }) => (
            <Form>
              <HeaderLayout
                primaryAction={
                  <Button
                    data-testid="save-button"
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
                          data-testid="autoRegister"
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
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.sso?.main}>
      <SingleSignOnPage />
    </CheckPagePermissions>
  );
};
