import {
  Button,
  Flex,
  Grid,
  MultiSelect,
  MultiSelectOption,
  Typography,
  Field,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import {
  Form,
  FormHelpers,
  InputProps,
  useField,
} from '../../../../../../admin/src/components/Form';
import { InputRenderer } from '../../../../../../admin/src/components/FormInputs/Renderer';
import { Layouts } from '../../../../../../admin/src/components/Layouts/Layout';
import { Page } from '../../../../../../admin/src/components/PageHelpers';
import { useTypedSelector } from '../../../../../../admin/src/core/store/hooks';
import { useNotification } from '../../../../../../admin/src/features/Notifications';
import { useAdminRoles } from '../../../../../../admin/src/hooks/useAdminRoles';
import { useAPIErrorHandler } from '../../../../../../admin/src/hooks/useAPIErrorHandler';
import { useRBAC } from '../../../../../../admin/src/hooks/useRBAC';
import {
  useGetProviderOptionsQuery,
  useUpdateProviderOptionsMutation,
} from '../../../../../../admin/src/services/auth';
import { isBaseQueryError } from '../../../../../../admin/src/utils/baseQuery';
import { translatedErrors } from '../../../../../../admin/src/utils/translatedErrors';
import { ProvidersOptions } from '../../../../../../shared/contracts/admin';

const SCHEMA = yup.object().shape({
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
  const { formatMessage } = useIntl();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { toggleNotification } = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  const { isLoading: isLoadingProviderOptions, data } = useGetProviderOptionsQuery();

  const [updateProviderOptions, { isLoading: isSubmittingForm }] =
    useUpdateProviderOptionsMutation();

  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate, canRead: canReadRoles },
  } = useRBAC({
    ...permissions.settings?.sso,
    readRoles: permissions.settings?.roles.read ?? [],
  });

  const { roles, isLoading: isLoadingRoles } = useAdminRoles(undefined, {
    skip: !canReadRoles,
  });

  const handleSubmit = async (
    body: ProvidersOptions.Request['body'],
    helpers: FormHelpers<ProvidersOptions.Request['body']>
  ) => {
    try {
      const res = await updateProviderOptions(body);

      if ('error' in res) {
        if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
          helpers.setErrors(formatValidationErrors(res.error));
        } else {
          toggleNotification({
            type: 'danger',
            message: formatAPIError(res.error),
          });
        }

        return;
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved' }),
      });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred, please try again.',
        }),
      });
    }
  };

  const isLoadingData = isLoadingRoles || isLoadingPermissions || isLoadingProviderOptions;

  return (
    <Layouts.Root>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'SSO',
          }
        )}
      </Page.Title>
      <Page.Main aria-busy={isSubmittingForm || isLoadingData} tabIndex={-1}>
        <Form
          method="PUT"
          onSubmit={handleSubmit}
          validationSchema={SCHEMA}
          disabled={!canUpdate}
          initialValues={
            data || {
              autoRegister: false,
              defaultRole: null,
              ssoLockedRoles: null,
            }
          }
        >
          {({ modified, isSubmitting }) => (
            <>
              <Layouts.Header
                primaryAction={
                  <Button
                    disabled={!modified}
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
              <Layouts.Content>
                {isSubmitting || isLoadingData ? (
                  <Page.Loading />
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
                    <Typography variant="delta" tag="h2">
                      {formatMessage({
                        id: 'global.settings',
                        defaultMessage: 'Settings',
                      })}
                    </Typography>
                    <Grid.Root gap={4}>
                      {[
                        {
                          hint: formatMessage({
                            id: 'Settings.sso.form.registration.description',
                            defaultMessage: 'Create new user on SSO login if no account exists',
                          }),
                          label: formatMessage({
                            id: 'Settings.sso.form.registration.label',
                            defaultMessage: 'Auto-registration',
                          }),
                          name: 'autoRegister',
                          size: 6,
                          type: 'boolean' as const,
                        },
                        {
                          hint: formatMessage({
                            id: 'Settings.sso.form.defaultRole.description',
                            defaultMessage:
                              'It will attach the new authenticated user to the selected role',
                          }),
                          label: formatMessage({
                            id: 'Settings.sso.form.defaultRole.label',
                            defaultMessage: 'Default role',
                          }),
                          name: 'defaultRole',
                          options: roles.map(({ id, name }) => ({
                            label: name,
                            value: id.toString(),
                          })),
                          placeholder: formatMessage({
                            id: 'components.InputSelect.option.placeholder',
                            defaultMessage: 'Choose here',
                          }),
                          size: 6,
                          type: 'enumeration' as const,
                        },
                        {
                          hint: formatMessage({
                            id: 'Settings.sso.form.localAuthenticationLock.description',
                            defaultMessage:
                              'Select the roles for which you want to disable the local authentication',
                          }),
                          label: formatMessage({
                            id: 'Settings.sso.form.localAuthenticationLock.label',
                            defaultMessage: 'Local authentication lock-out',
                          }),
                          name: 'ssoLockedRoles',
                          options: roles.map(({ id, name }) => ({
                            label: name,
                            value: id.toString(),
                          })),
                          placeholder: formatMessage({
                            id: 'components.InputSelect.option.placeholder',
                            defaultMessage: 'Choose here',
                          }),
                          size: 6,
                          type: 'multi' as const,
                        },
                      ].map(({ size, ...field }) => (
                        <Grid.Item
                          key={field.name}
                          col={size}
                          direction="column"
                          alignItems="stretch"
                        >
                          <FormInputRenderer {...field} />
                        </Grid.Item>
                      ))}
                    </Grid.Root>
                  </Flex>
                )}
              </Layouts.Content>
            </>
          )}
        </Form>
      </Page.Main>
    </Layouts.Root>
  );
};

type FormInputProps = InputProps | MultiSelectInputProps;

const FormInputRenderer = (props: FormInputProps) => {
  switch (props.type) {
    case 'multi':
      return <MultiSelectInput {...props} />;
    default:
      return <InputRenderer {...props} />;
  }
};

type MultiSelectInputProps = Omit<Extract<InputProps, { type: 'enumeration' }>, 'type'> & {
  type: 'multi';
};

const MultiSelectInput = ({ hint, label, name, options, ...props }: MultiSelectInputProps) => {
  const field = useField(name);

  return (
    <Field.Root name={name} hint={hint} error={field.error}>
      <Field.Label>{label}</Field.Label>
      <MultiSelect
        onChange={(value) => field.onChange('ssoLockedRoles', value)}
        onClear={() => field.onChange('ssoLockedRoles', [])}
        value={field.value ?? []}
        withTags
        {...props}
      >
        {options.map(({ label, value }) => (
          <MultiSelectOption key={value} value={value}>
            {label}
          </MultiSelectOption>
        ))}
      </MultiSelect>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export const ProtectedSSO = () => {
  const permissions = useTypedSelector((state) => state.admin_app.permissions.settings?.sso?.main);

  return (
    <Page.Protect permissions={permissions}>
      <SingleSignOnPage />
    </Page.Protect>
  );
};
