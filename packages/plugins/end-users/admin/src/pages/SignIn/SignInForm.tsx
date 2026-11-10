import * as React from 'react';

import {
  Form,
  InputRenderer,
  Layouts,
  useField,
  type FormHelpers,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  MultiSelect,
  MultiSelectOption,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ToggleField } from '../../components/FormFields';
import { ReadOnlyList, ReadOnlyRow } from '../../components/ReadOnlyRow';
import { formatDuration } from '../../utils/configWords';
import { getTranslation } from '../../utils/getTranslation';
import { useSaveSettings } from '../../utils/useSaveSettings';

import type { RoleListItem } from '../../../../shared/contracts/roles';
import type {
  EndUsersSettings,
  SettingsResponse,
  SignInMethod,
} from '../../../../shared/contracts/settings';

/** The settings this page edits: the rest of the document belongs to the Advanced page */
type SignInValues = Pick<EndUsersSettings, 'methods' | 'signUp' | 'passwords' | 'lockout'>;

interface SignInFormProps {
  settings: SettingsResponse;
  /** The roles a sign-up can give by default: every role but Public */
  roles: RoleListItem[];
  /** The roles could not be read (no `roles.read`): the stored ids are shown as they are */
  rolesUnavailable?: boolean;
  /** The profile fields a sign-up could be asked for */
  profileFields: string[];
  canUpdate: boolean;
}

const METHODS: Array<{ id: SignInMethod; label: string }> = [
  { id: 'emailPassword', label: 'Email and password' },
  { id: 'username', label: 'Username' },
  { id: 'twoFactor', label: 'Two-factor authentication' },
  { id: 'magicLink', label: 'Magic link' },
  { id: 'emailOtp', label: 'Email one-time code' },
  { id: 'passkey', label: 'Passkeys' },
];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="delta" tag="h2">
        {title}
      </Typography>
      {children}
    </Flex>
  </Box>
);

/** A list the editor picks from, kept in the form as the ids it holds */
const ListField = ({
  name,
  label,
  hint,
  placeholder,
  options,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
}) => {
  const field = useField<string[]>(name);

  return (
    <Field.Root name={name} error={field.error} hint={hint}>
      <Field.Label>{label}</Field.Label>
      <MultiSelect
        value={field.value ?? []}
        disabled={disabled}
        withTags
        placeholder={placeholder}
        onChange={(value: string[]) => field.onChange(name, value)}
      >
        {options.map((option) => (
          <MultiSelectOption key={option.value} value={option.value}>
            {option.label}
          </MultiSelectOption>
        ))}
      </MultiSelect>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

/**
 * A method whose package is not installed cannot work, so it reads as off whatever is stored: the
 * stored value is kept (a save leaves it out), and turns on again once the package is added.
 */
const NotInstalledMethod = ({ name, label }: { name: string; label: string }) => {
  const { formatMessage } = useIntl();

  return (
    <Field.Root
      name={name}
      maxWidth="320px"
      hint={formatMessage(
        {
          id: getTranslation('settings.sign-in.not-installed'),
          defaultMessage: 'Not installed. Add it in <code>config/plugins.ts</code>.',
        },
        { code: (chunks: React.ReactNode) => <code>{chunks}</code> }
      )}
    >
      <Field.Label>{label}</Field.Label>
      <Toggle
        checked={false}
        disabled
        onLabel={formatMessage({
          id: 'app.components.ToggleCheckbox.enabled-label',
          defaultMessage: 'Enabled',
        })}
        offLabel={formatMessage({
          id: 'app.components.ToggleCheckbox.disabled-label',
          defaultMessage: 'Disabled',
        })}
      />
      <Field.Hint />
    </Field.Root>
  );
};

const SignInForm = ({
  settings,
  roles,
  rolesUnavailable = false,
  profileFields,
  canUpdate,
}: SignInFormProps) => {
  const { formatMessage } = useIntl();
  const save = useSaveSettings();
  const { data, meta } = settings;
  const disabled = !canUpdate;

  const installed = new Set(meta.installedMethods);
  const initialValues: SignInValues = {
    methods: data.methods,
    signUp: data.signUp,
    passwords: data.passwords,
    lockout: data.lockout,
  };

  // A stored role the list does not have (or cannot give) stays visible, shown as its id
  const roleOptions = roles.map((role) => ({ value: role.documentId, label: role.name }));
  const listedRoles = new Set(roleOptions.map((option) => option.value));

  data.signUp.defaultRoles.forEach((id) => {
    if (!listedRoles.has(id)) {
      roleOptions.push({ value: id, label: id });
    }
  });

  const on = formatMessage({
    id: 'app.components.ToggleCheckbox.enabled-label',
    defaultMessage: 'Enabled',
  });
  const off = formatMessage({
    id: 'app.components.ToggleCheckbox.disabled-label',
    defaultMessage: 'Disabled',
  });

  const handleSubmit = (values: SignInValues, helpers: FormHelpers<SignInValues>) => {
    // A method that is not installed cannot be turned on: it is left as it is stored
    const methods = Object.fromEntries(
      Object.entries(values.methods).filter(([method]) => installed.has(method))
    );

    return save({ ...values, methods }, helpers);
  };

  const toggle = (name: string, label: string, hint?: string, isDisabled = disabled) => (
    <ToggleField name={name} label={label} hint={hint} disabled={isDisabled} />
  );

  const number = (name: string, label: string) => (
    <InputRenderer type="integer" name={name} label={label} disabled={disabled} required />
  );

  return (
    <Form method="PUT" initialValues={initialValues} disabled={disabled} onSubmit={handleSubmit}>
      {({ modified, isSubmitting }) => (
        <>
          <Layouts.Header
            title={formatMessage({
              id: getTranslation('settings.sign-in.title'),
              defaultMessage: 'Sign-in',
            })}
            subtitle={formatMessage({
              id: getTranslation('settings.sign-in.subtitle'),
              defaultMessage: 'How end users register and sign in',
            })}
            primaryAction={
              <Button
                type="submit"
                startIcon={<Check />}
                loading={isSubmitting}
                disabled={disabled || !modified}
              >
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            }
          />
          <Layouts.Content>
            <Flex direction="column" alignItems="stretch" gap={6}>
              <Section
                title={formatMessage({
                  id: getTranslation('settings.sign-in.methods'),
                  defaultMessage: 'Methods',
                })}
              >
                <Grid.Root gap={4}>
                  {METHODS.map(({ id, label: methodLabel }) => {
                    const isInstalled = installed.has(id);
                    const label = formatMessage({
                      id: getTranslation(`settings.sign-in.method.${id}`),
                      defaultMessage: methodLabel,
                    });

                    return (
                      <Grid.Item key={id} xs={12} col={6} direction="column" alignItems="stretch">
                        {isInstalled ? (
                          toggle(`methods.${id}`, label)
                        ) : (
                          <NotInstalledMethod name={`methods.${id}`} label={label} />
                        )}
                      </Grid.Item>
                    );
                  })}
                </Grid.Root>
              </Section>

              <Section
                title={formatMessage({
                  id: getTranslation('settings.sign-in.registration'),
                  defaultMessage: 'Registration',
                })}
              >
                <Grid.Root gap={4}>
                  <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
                    {toggle(
                      'signUp.enabled',
                      formatMessage({
                        id: getTranslation('settings.sign-in.sign-up'),
                        defaultMessage: 'Allow sign-up',
                      })
                    )}
                  </Grid.Item>
                  <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
                    {toggle(
                      'signUp.requireEmailVerification',
                      formatMessage({
                        id: getTranslation('settings.sign-in.require-verification'),
                        defaultMessage: 'Require email verification',
                      })
                    )}
                  </Grid.Item>
                  <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
                    <ListField
                      name="signUp.defaultRoles"
                      label={formatMessage({
                        id: getTranslation('settings.sign-in.default-roles'),
                        defaultMessage: 'Default roles',
                      })}
                      hint={
                        rolesUnavailable
                          ? formatMessage({
                              id: getTranslation('settings.sign-in.default-roles.unavailable'),
                              defaultMessage:
                                'Your permissions do not let you list roles, so the chosen ones are shown by id.',
                            })
                          : formatMessage({
                              id: getTranslation('settings.sign-in.default-roles.hint'),
                              defaultMessage: 'With none chosen, a new user is Authenticated.',
                            })
                      }
                      placeholder={formatMessage({
                        id: getTranslation('settings.sign-in.default-roles.placeholder'),
                        defaultMessage: 'Choose roles',
                      })}
                      options={roleOptions}
                      disabled={disabled}
                    />
                  </Grid.Item>
                  <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
                    <ListField
                      name="signUp.registrationFields"
                      label={formatMessage({
                        id: getTranslation('settings.sign-in.registration-fields'),
                        defaultMessage: 'Registration fields',
                      })}
                      hint={formatMessage({
                        id: getTranslation('settings.sign-in.registration-fields.hint'),
                        defaultMessage: 'The profile fields a user can fill in when signing up.',
                      })}
                      placeholder={formatMessage({
                        id: getTranslation('settings.sign-in.registration-fields.placeholder'),
                        defaultMessage: 'Choose fields',
                      })}
                      options={profileFields.map((name) => ({ value: name, label: name }))}
                      disabled={disabled}
                    />
                  </Grid.Item>
                </Grid.Root>
              </Section>

              <Section
                title={formatMessage({
                  id: getTranslation('settings.sign-in.passwords'),
                  defaultMessage: 'Passwords',
                })}
              >
                <Grid.Root gap={4}>
                  <Grid.Item xs={12} col={4} direction="column" alignItems="stretch">
                    {number(
                      'passwords.minLength',
                      formatMessage({
                        id: getTranslation('settings.sign-in.min-length'),
                        defaultMessage: 'Minimum length',
                      })
                    )}
                  </Grid.Item>
                  <Grid.Item xs={12} col={4} direction="column" alignItems="stretch">
                    {number(
                      'passwords.maxLength',
                      formatMessage({
                        id: getTranslation('settings.sign-in.max-length'),
                        defaultMessage: 'Maximum length',
                      })
                    )}
                  </Grid.Item>
                  <Grid.Item xs={12} col={4} direction="column" alignItems="stretch">
                    {toggle(
                      'passwords.requireMixedClasses',
                      formatMessage({
                        id: getTranslation('settings.sign-in.mixed-classes'),
                        defaultMessage: 'Require mixed character classes',
                      })
                    )}
                  </Grid.Item>
                  <Grid.Item xs={12} col={4} direction="column" alignItems="stretch">
                    {/* Installed in code, so read-only */}
                    <Field.Root
                      name="breachedPasswordCheck"
                      maxWidth="320px"
                      hint={formatMessage(
                        {
                          id: getTranslation('settings.sign-in.breached.hint'),
                          defaultMessage: 'Set in <code>config/plugins.ts</code>',
                        },
                        { code: (chunks: React.ReactNode) => <code>{chunks}</code> }
                      )}
                    >
                      <Field.Label>
                        {formatMessage({
                          id: getTranslation('settings.sign-in.breached'),
                          defaultMessage: 'Reject breached passwords',
                        })}
                      </Field.Label>
                      <Toggle
                        name="breachedPasswordCheck"
                        checked={meta.breachedCheckInstalled}
                        disabled
                        onLabel={on}
                        offLabel={off}
                      />
                      <Field.Hint />
                    </Field.Root>
                  </Grid.Item>
                </Grid.Root>
              </Section>

              <Section
                title={formatMessage({
                  id: getTranslation('settings.sign-in.lockout'),
                  defaultMessage: 'Lockout',
                })}
              >
                <Grid.Root gap={4}>
                  <Grid.Item xs={12} col={4} direction="column" alignItems="stretch">
                    {toggle(
                      'lockout.enabled',
                      formatMessage({
                        id: getTranslation('settings.sign-in.lockout.enabled'),
                        defaultMessage: 'Lock accounts after failed sign-ins',
                      })
                    )}
                  </Grid.Item>
                  <Grid.Item xs={12} col={4} direction="column" alignItems="stretch">
                    {number(
                      'lockout.maxAttempts',
                      formatMessage({
                        id: getTranslation('settings.sign-in.lockout.attempts'),
                        defaultMessage: 'Failed attempts',
                      })
                    )}
                  </Grid.Item>
                  <Grid.Item xs={12} col={4} direction="column" alignItems="stretch">
                    {number(
                      'lockout.durationMinutes',
                      formatMessage({
                        id: getTranslation('settings.sign-in.lockout.minutes'),
                        defaultMessage: 'Lockout minutes',
                      })
                    )}
                  </Grid.Item>
                </Grid.Root>
              </Section>

              <Section
                title={formatMessage({
                  id: getTranslation('settings.sign-in.sessions'),
                  defaultMessage: 'Sessions',
                })}
              >
                <Typography textColor="neutral600">
                  {formatMessage(
                    {
                      id: getTranslation('settings.sign-in.sessions.hint'),
                      defaultMessage: 'Set in <code>config/plugins.ts</code>',
                    },
                    { code: (chunks: React.ReactNode) => <code>{chunks}</code> }
                  )}
                </Typography>
                <ReadOnlyList>
                  <ReadOnlyRow
                    label={formatMessage({
                      id: getTranslation('settings.sessions.expires-in'),
                      defaultMessage: 'Session lasts',
                    })}
                  >
                    {formatDuration(meta.config.session.expiresIn, formatMessage)}
                  </ReadOnlyRow>
                  <ReadOnlyRow
                    label={formatMessage({
                      id: getTranslation('settings.sessions.update-age'),
                      defaultMessage: 'Session renewed after',
                    })}
                  >
                    {formatDuration(meta.config.session.updateAge, formatMessage)}
                  </ReadOnlyRow>
                  <ReadOnlyRow
                    label={formatMessage({
                      id: getTranslation('settings.sessions.cookie-cache'),
                      defaultMessage: 'Session cookie cache',
                    })}
                  >
                    {meta.config.session.cookieCache === false
                      ? formatMessage({
                          id: getTranslation('settings.config.off'),
                          defaultMessage: 'Off',
                        })
                      : formatDuration(meta.config.session.cookieCache, formatMessage)}
                  </ReadOnlyRow>
                </ReadOnlyList>
              </Section>
            </Flex>
          </Layouts.Content>
        </>
      )}
    </Form>
  );
};

export { SignInForm };
