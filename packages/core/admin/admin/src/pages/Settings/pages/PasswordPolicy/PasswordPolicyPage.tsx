import * as React from 'react';

import { Button, Flex, Grid, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { Form, FormHelpers, useForm } from '../../../../components/Form';
import { InputRenderer } from '../../../../components/FormInputs/Renderer';
import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useRBAC } from '../../../../hooks/useRBAC';
import {
  useGetPasswordPolicyQuery,
  useUpdatePasswordPolicyMutation,
} from '../../../../services/admin';
import { isBaseQueryError } from '../../../../utils/baseQuery';
import {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_MIN_LENGTH_CEILING,
  PASSWORD_MIN_LENGTH_FLOOR,
  formatPasswordPolicyHint,
} from '../../../../utils/passwordPolicy';
import { translatedErrors } from '../../../../utils/translatedErrors';

import type { PasswordPolicy } from '../../../../../../shared/contracts/admin';

const SCHEMA = yup.object().shape({
  minLength: yup
    .number()
    .integer(translatedErrors.integer)
    .min(PASSWORD_MIN_LENGTH_FLOOR, {
      ...translatedErrors.min,
      values: { min: PASSWORD_MIN_LENGTH_FLOOR },
    })
    .max(PASSWORD_MIN_LENGTH_CEILING, {
      ...translatedErrors.max,
      values: { max: PASSWORD_MIN_LENGTH_CEILING },
    })
    .required(translatedErrors.required),
  requireLowercase: yup.boolean().required(translatedErrors.required),
  requireUppercase: yup.boolean().required(translatedErrors.required),
  requireNumber: yup.boolean().required(translatedErrors.required),
  requireSpecialCharacter: yup.boolean().required(translatedErrors.required),
});

/* -------------------------------------------------------------------------------------------------
 * PasswordPolicyPage
 * -----------------------------------------------------------------------------------------------*/

const PasswordPolicyPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['password-policy']
  );
  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canUpdate },
  } = useRBAC(permissions?.update ?? []);

  const { data: policy, isLoading, error } = useGetPasswordPolicyQuery();
  const [updatePasswordPolicy, { isLoading: isSubmitting }] = useUpdatePasswordPolicyMutation();

  React.useEffect(() => {
    if (error) {
      toggleNotification({ type: 'danger', message: formatAPIError(error) });
    }
  }, [error, formatAPIError, toggleNotification]);

  const handleSubmit = async (body: PasswordPolicy, helpers: FormHelpers<PasswordPolicy>) => {
    const res = await updatePasswordPolicy(body);

    if ('error' in res) {
      if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
        helpers.setErrors(formatValidationErrors(res.error));
      } else {
        toggleNotification({
          type: 'danger',
          message: isBaseQueryError(res.error)
            ? formatAPIError(res.error)
            : formatMessage({
                id: 'notification.error',
                defaultMessage: 'An error occurred, please try again.',
              }),
        });
      }

      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
    });
  };

  const title = formatMessage({
    id: 'Settings.passwordPolicy.title',
    defaultMessage: 'Password policy',
  });

  if (isLoading || isLoadingRBAC) {
    return <Page.Loading />;
  }

  if (error || !policy) {
    return <Page.Error />;
  }

  return (
    <Page.Main aria-busy={isSubmitting} tabIndex={-1}>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: title }
        )}
      </Page.Title>
      <Form
        method="PUT"
        initialValues={policy}
        validationSchema={SCHEMA}
        onSubmit={handleSubmit}
        disabled={!canUpdate}
      >
        {({ modified, isSubmitting }) => (
          <>
            <Layouts.Header
              title={title}
              subtitle={formatMessage({
                id: 'Settings.passwordPolicy.description',
                defaultMessage:
                  'Define the rules every administrator password has to follow. Existing passwords are not affected until they are changed.',
              })}
              primaryAction={
                canUpdate && (
                  <Button
                    disabled={!modified}
                    loading={isSubmitting}
                    startIcon={<Check />}
                    type="submit"
                    fullWidth
                  >
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                )
              }
            />
            <Layouts.Content>
              <Flex direction="column" alignItems="stretch" gap={6}>
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
                      id: 'Settings.passwordPolicy.form.title',
                      defaultMessage: 'Rules',
                    })}
                  </Typography>
                  <Grid.Root gap={4}>
                    {[
                      {
                        name: 'minLength',
                        type: 'integer' as const,
                        label: formatMessage({
                          id: 'Settings.passwordPolicy.form.minLength.label',
                          defaultMessage: 'Minimum length',
                        }),
                        hint: formatMessage(
                          {
                            id: 'Settings.passwordPolicy.form.minLength.hint',
                            defaultMessage: 'Between {min} and {max} characters',
                          },
                          { min: PASSWORD_MIN_LENGTH_FLOOR, max: PASSWORD_MIN_LENGTH_CEILING }
                        ),
                        size: 6,
                      },
                      {
                        name: 'requireLowercase',
                        type: 'boolean' as const,
                        label: formatMessage({
                          id: 'Settings.passwordPolicy.form.requireLowercase.label',
                          defaultMessage: 'Require a lowercase letter',
                        }),
                        size: 6,
                      },
                      {
                        name: 'requireUppercase',
                        type: 'boolean' as const,
                        label: formatMessage({
                          id: 'Settings.passwordPolicy.form.requireUppercase.label',
                          defaultMessage: 'Require an uppercase letter',
                        }),
                        size: 6,
                      },
                      {
                        name: 'requireNumber',
                        type: 'boolean' as const,
                        label: formatMessage({
                          id: 'Settings.passwordPolicy.form.requireNumber.label',
                          defaultMessage: 'Require a number',
                        }),
                        size: 6,
                      },
                      {
                        name: 'requireSpecialCharacter',
                        type: 'boolean' as const,
                        label: formatMessage({
                          id: 'Settings.passwordPolicy.form.requireSpecialCharacter.label',
                          defaultMessage: 'Require a special character',
                        }),
                        hint: formatMessage({
                          id: 'Settings.passwordPolicy.form.requireSpecialCharacter.hint',
                          defaultMessage: 'Any character that is neither a letter nor a number',
                        }),
                        size: 6,
                      },
                    ].map(({ size, ...field }) => (
                      <Grid.Item
                        key={field.name}
                        col={size}
                        xs={12}
                        direction="column"
                        alignItems="stretch"
                      >
                        <InputRenderer {...field} disabled={!canUpdate} required />
                      </Grid.Item>
                    ))}
                  </Grid.Root>
                </Flex>
                <PolicyPreview />
              </Flex>
            </Layouts.Content>
          </>
        )}
      </Form>
    </Page.Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PolicyPreview
 * -----------------------------------------------------------------------------------------------*/

/**
 * Shows the hint users will read under password inputs, from the values being edited.
 */
const PolicyPreview = () => {
  const { formatMessage } = useIntl();
  const values = useForm('PolicyPreview', (state) => state.values) as Partial<PasswordPolicy>;

  return (
    <Flex
      direction="column"
      alignItems="stretch"
      gap={2}
      background="neutral0"
      padding={6}
      shadow="filterShadow"
      hasRadius
    >
      <Typography variant="delta" tag="h2">
        {formatMessage({
          id: 'Settings.passwordPolicy.preview.title',
          defaultMessage: 'Hint shown to users',
        })}
      </Typography>
      <Typography textColor="neutral600" data-testid="password-policy-preview">
        {formatPasswordPolicyHint(
          {
            ...DEFAULT_PASSWORD_POLICY,
            ...values,
            minLength: values.minLength ?? PASSWORD_MIN_LENGTH_FLOOR,
          },
          formatMessage
        )}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedPasswordPolicyPage
 * -----------------------------------------------------------------------------------------------*/

const ProtectedPasswordPolicyPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['password-policy']?.main
  );

  return (
    <Page.Protect permissions={permissions}>
      <PasswordPolicyPage />
    </Page.Protect>
  );
};

export { PasswordPolicyPage, ProtectedPasswordPolicyPage };
