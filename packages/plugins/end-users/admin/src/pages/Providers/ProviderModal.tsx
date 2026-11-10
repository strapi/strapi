import * as React from 'react';

import {
  Form,
  translatedErrors,
  UnsavedChangesModal,
  useAPIErrorHandler,
  useClipboard,
  useField,
  useForm,
  useNotification,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Combobox,
  ComboboxOption,
  Field,
  Flex,
  IconButton,
  Loader,
  Modal,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Duplicate, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { SelectField, TextField, ToggleField } from '../../components/FormFields';
import { useGetProviderQuery, useUpdateProviderMutation } from '../../services/providers';
import { useGetProfileFieldsQuery } from '../../services/settings';
import { getTranslation } from '../../utils/getTranslation';
import { getFormErrors } from '../../utils/validationErrors';

import type {
  ProfileMappingRow,
  ProfileMappingWhen,
  ProviderDetail,
  ProviderField,
  ProviderUpdateBody,
} from '../../../../shared/contracts/providers';
import type { FormErrors, FormHelpers } from '@strapi/admin/strapi-admin';

interface ProviderModalProps {
  /** The provider to open; the modal is open while there is one */
  id: string | null;
  /** Whether the admin may save: without it the modal reads like a locked provider */
  canUpdate: boolean;
  onClose: () => void;
}

type FieldValue = string | boolean;

/** One mapping row as edited: the form keeps a key beside it, so a row stays put while others go */
type EditedRow = ProfileMappingRow & { __temp_key__?: string };

interface ProviderFormValues {
  enabled: boolean;
  clientId: string;
  /** The secret the admin typed to replace the stored one; empty leaves it as it is */
  clientSecret: string;
  scopes: string;
  discoveryUrl: string;
  fields: Record<string, FieldValue>;
  /** The secret fields the admin typed a new value for, by name */
  secretFields: Record<string, string>;
  trustForLinking: boolean;
  updateUserOnSignIn: boolean;
  profileMapping: EditedRow[];
}

const WHEN: ProfileMappingWhen[] = ['sign-up', 'every-sign-in'];

/** Scopes are typed as words separated by spaces or commas */
const toScopes = (text: string) => text.split(/[\s,]+/).filter(Boolean);

/**
 * A secret is never shown. It reads "Set" or "Not set" until the admin chooses to replace it, and
 * what the admin types is the only thing that is ever sent: an untouched secret is left out.
 */
const SecretInput = ({
  name,
  label,
  isSet,
  disabled,
  required,
  multiline,
  hint,
}: {
  /** Where the typed value lives in the form */
  name: string;
  label: string;
  isSet: boolean;
  disabled: boolean;
  required?: boolean;
  multiline?: boolean;
  hint?: string;
}) => {
  const { formatMessage } = useIntl();
  const field = useField<string>(name);
  const [replacing, setReplacing] = React.useState(false);
  const showInput = !disabled && (!isSet || replacing);
  const value = field.value ?? '';
  const onChange = (next: string) => field.onChange(name, next);

  return (
    <Field.Root name={name} error={field.error} hint={hint} required={required}>
      <Field.Label>{label}</Field.Label>
      {showInput ? (
        <Flex gap={2} alignItems="flex-start">
          <Box grow={1}>
            {multiline ? (
              <Textarea value={value} onChange={(event) => onChange(event.target.value)} />
            ) : (
              <TextInput
                type="password"
                autoComplete="off"
                value={value}
                onChange={(event) => onChange(event.target.value)}
              />
            )}
          </Box>
          {isSet && (
            <Button
              type="button"
              variant="tertiary"
              onClick={() => {
                onChange('');
                setReplacing(false);
              }}
            >
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          )}
        </Flex>
      ) : (
        <Flex gap={2}>
          <Typography textColor="neutral800">
            {isSet
              ? formatMessage({ id: getTranslation('providers.secret.set'), defaultMessage: 'Set' })
              : formatMessage({
                  id: getTranslation('providers.secret.not-set'),
                  defaultMessage: 'Not set',
                })}
          </Typography>
          {!disabled && (
            <Button type="button" variant="tertiary" size="S" onClick={() => setReplacing(true)}>
              {formatMessage({
                id: getTranslation('providers.secret.replace'),
                defaultMessage: 'Replace',
              })}
            </Button>
          )}
        </Flex>
      )}
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

/** The input of one field of the provider's definition, by its type */
const DefinitionField = ({
  name,
  field,
  detail,
  disabled,
}: {
  name: string;
  field: ProviderField;
  detail: ProviderDetail;
  disabled: boolean;
}) => {
  const path = `fields.${name}`;

  if (field.type === 'secret') {
    const current = detail.fields[name];

    return (
      <SecretInput
        name={`secretFields.${name}`}
        label={field.label}
        hint={field.hint}
        required={field.required}
        multiline={field.multiline}
        isSet={typeof current === 'object' && current !== null && current.set}
        disabled={disabled}
      />
    );
  }

  if (field.type === 'boolean') {
    return <ToggleField name={path} label={field.label} hint={field.hint} disabled={disabled} />;
  }

  if (field.type === 'select') {
    return (
      <SelectField
        name={path}
        label={field.label}
        hint={field.hint}
        required={field.required}
        disabled={disabled}
        options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
      />
    );
  }

  return field.multiline ? (
    <MultilineField
      name={path}
      label={field.label}
      hint={field.hint}
      required={field.required}
      disabled={disabled}
    />
  ) : (
    <TextField
      name={path}
      label={field.label}
      hint={field.hint}
      required={field.required}
      disabled={disabled}
      type={field.type === 'url' ? 'url' : 'text'}
    />
  );
};

const MultilineField = ({
  name,
  label,
  hint,
  required,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  disabled: boolean;
}) => {
  const field = useField<string>(name);

  return (
    <Field.Root name={name} error={field.error} hint={hint} required={required}>
      <Field.Label>{label}</Field.Label>
      <Textarea
        value={field.value ?? ''}
        disabled={disabled}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          field.onChange(name, event.target.value)
        }
      />
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

const initialFieldValues = (detail: ProviderDetail): Record<string, FieldValue> =>
  Object.fromEntries(
    Object.entries(detail.definition.fields)
      .filter(([, field]) => field.type !== 'secret')
      .map(([name, field]) => {
        const stored = detail.fields[name];
        const fallback = field.default ?? (field.type === 'boolean' ? false : '');

        return [
          name,
          typeof stored === 'string' || typeof stored === 'boolean' ? stored : fallback,
        ];
      })
  );

/** One row of the profile mapping: an attribute of the profile, the claim written to it, and when */
const MappingRow = ({
  index,
  claims,
  attributes,
  whenLabels,
  disabled,
}: {
  index: number;
  claims: NonNullable<ProviderDetail['definition']['claims']>;
  attributes: string[];
  whenLabels: Record<ProfileMappingWhen, string>;
  disabled: boolean;
}) => {
  const { formatMessage } = useIntl();
  const removeRow = useForm('MappingRow', (state) => state.removeFieldRow);
  const attribute = useField<string>(`profileMapping.${index}.attribute`);
  const claim = useField<string>(`profileMapping.${index}.claim`);
  const when = useField<ProfileMappingWhen>(`profileMapping.${index}.when`);

  const claimOptions = Object.entries(claims).map(([key, definition]) => ({
    value: key,
    label: definition.label,
  }));

  if (claim.value && !(claim.value in claims)) {
    claimOptions.push({ value: claim.value, label: claim.value });
  }

  return (
    <Flex gap={2} alignItems="flex-end">
      <Box grow={1}>
        <Field.Root name={`profileMapping.${index}.attribute`} error={attribute.error}>
          <Field.Label>
            {formatMessage({
              id: getTranslation('providers.mapping.attribute'),
              defaultMessage: 'Profile attribute',
            })}
          </Field.Label>
          <SingleSelect
            value={attribute.value ? attribute.value : undefined}
            disabled={disabled}
            onChange={(next: string | number) =>
              attribute.onChange(`profileMapping.${index}.attribute`, String(next))
            }
          >
            {attributes.map((name) => (
              <SingleSelectOption key={name} value={name}>
                {name}
              </SingleSelectOption>
            ))}
          </SingleSelect>
          <Field.Error />
        </Field.Root>
      </Box>
      <Box grow={1}>
        <Field.Root name={`profileMapping.${index}.claim`} error={claim.error}>
          <Field.Label>
            {formatMessage({
              id: getTranslation('providers.mapping.claim'),
              defaultMessage: 'Claim',
            })}
          </Field.Label>
          <Combobox
            creatable
            value={claim.value ? claim.value : undefined}
            disabled={disabled}
            placeholder=""
            onChange={(next: string | number | undefined) =>
              claim.onChange(`profileMapping.${index}.claim`, next ? String(next) : '')
            }
            onCreateOption={(next?: string) =>
              next && claim.onChange(`profileMapping.${index}.claim`, next)
            }
            onClear={() => claim.onChange(`profileMapping.${index}.claim`, '')}
          >
            {claimOptions.map((option) => (
              <ComboboxOption key={option.value} value={option.value}>
                {option.label}
              </ComboboxOption>
            ))}
          </Combobox>
          <Field.Error />
        </Field.Root>
      </Box>
      <Box grow={1}>
        <Field.Root name={`profileMapping.${index}.when`} error={when.error}>
          <Field.Label>
            {formatMessage({
              id: getTranslation('providers.mapping.when'),
              defaultMessage: 'When',
            })}
          </Field.Label>
          <SingleSelect
            value={when.value}
            disabled={disabled}
            onChange={(next: string | number) =>
              when.onChange(`profileMapping.${index}.when`, String(next) as ProfileMappingWhen)
            }
          >
            {WHEN.map((option) => (
              <SingleSelectOption key={option} value={option}>
                {whenLabels[option]}
              </SingleSelectOption>
            ))}
          </SingleSelect>
          <Field.Error />
        </Field.Root>
      </Box>
      {!disabled && (
        <IconButton
          type="button"
          label={formatMessage(
            {
              id: getTranslation('providers.mapping.remove'),
              defaultMessage: 'Remove mapping row {number}',
            },
            { number: index + 1 }
          )}
          variant="ghost"
          onClick={() => removeRow('profileMapping', index)}
        >
          <Trash />
        </IconButton>
      )}
    </Flex>
  );
};

/** The rows of the mapping, and the button that adds one */
const ProfileMapping = ({
  claims,
  disabled,
}: {
  claims: NonNullable<ProviderDetail['definition']['claims']>;
  disabled: boolean;
}) => {
  const { formatMessage } = useIntl();
  const profileFields = useGetProfileFieldsQuery();
  const rows = useForm(
    'ProfileMapping',
    (state) => (state.values as ProviderFormValues).profileMapping
  );
  const addRow = useForm('ProfileMapping', (state) => state.addFieldRow);
  const attributes = profileFields.data ?? [];

  const whenLabels: Record<ProfileMappingWhen, string> = {
    'sign-up': formatMessage({
      id: getTranslation('providers.mapping.when.sign-up'),
      defaultMessage: 'On sign-up',
    }),
    'every-sign-in': formatMessage({
      id: getTranslation('providers.mapping.when.every-sign-in'),
      defaultMessage: 'On every sign-in',
    }),
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Typography variant="delta" tag="h3">
        {formatMessage({
          id: getTranslation('providers.mapping'),
          defaultMessage: 'Profile mapping',
        })}
      </Typography>
      <Typography textColor="neutral600">
        {formatMessage({
          id: getTranslation('providers.mapping.hint'),
          defaultMessage: 'Write a claim of the provider to an attribute of the profile.',
        })}
      </Typography>
      {rows.map((row, index) => (
        <MappingRow
          // A row added here has a key that stays with it while others come and go
          key={row.__temp_key__ ?? `saved-${index}`}
          index={index}
          claims={claims}
          attributes={attributes}
          whenLabels={whenLabels}
          disabled={disabled}
        />
      ))}
      {!disabled && (
        <Box>
          <Button
            type="button"
            variant="tertiary"
            startIcon={<Plus />}
            onClick={() => addRow('profileMapping', { attribute: '', claim: '', when: 'sign-up' })}
          >
            {formatMessage({
              id: getTranslation('providers.mapping.add'),
              defaultMessage: 'Add mapping',
            })}
          </Button>
        </Box>
      )}
    </Flex>
  );
};

/** What the save needs and the admin left empty, by the form path of the field */
const missingRequired = (values: ProviderFormValues, detail: ProviderDetail, isCustom: boolean) => {
  const missing: string[] = [];

  if (isCustom && values.discoveryUrl.trim() === '') {
    missing.push('discoveryUrl');
  }

  if (values.clientId.trim() === '') {
    missing.push('clientId');
  }

  if (!detail.clientSecretSet && values.clientSecret.trim() === '') {
    missing.push('clientSecret');
  }

  for (const [name, field] of Object.entries(detail.definition.fields)) {
    if (!field.required) {
      continue;
    }

    if (field.type === 'secret') {
      const stored = detail.fields[name];
      const isSet = typeof stored === 'object' && stored !== null && stored.set;

      if (!isSet && (values.secretFields[name] ?? '').trim() === '') {
        missing.push(`secretFields.${name}`);
      }
    } else if (field.type !== 'boolean' && String(values.fields[name] ?? '').trim() === '') {
      missing.push(`fields.${name}`);
    }
  }

  return missing;
};

const ProviderForm = ({
  detail,
  canUpdate,
  onClose,
}: {
  detail: ProviderDetail;
  canUpdate: boolean;
  onClose: () => void;
}) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { copy } = useClipboard();
  const [update] = useUpdateProviderMutation();

  // A provider from config is locked: nothing here can be changed
  const locked = detail.source === 'config';
  const disabled = locked || !canUpdate;
  const claims = detail.definition.claims ?? {};
  const isCustom = detail.kind === 'oidc' && detail.package === null;

  const initialValues = React.useMemo(
    (): ProviderFormValues => ({
      enabled: detail.enabled,
      clientId: detail.clientId,
      clientSecret: '',
      scopes: detail.scopes.join(' '),
      discoveryUrl: detail.discoveryUrl ?? '',
      fields: initialFieldValues(detail),
      secretFields: {},
      trustForLinking: detail.trustForLinking,
      updateUserOnSignIn: detail.updateUserOnSignIn,
      profileMapping: detail.profileMapping.map((row) => ({ ...row })),
    }),
    [detail]
  );

  const handleCopy = async () => {
    if (await copy(detail.redirectUri)) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('providers.redirect-uri.copied'),
          defaultMessage: 'Redirect URI copied',
        }),
      });
    }
  };

  const handleSubmit = async (
    values: ProviderFormValues,
    { setErrors }: FormHelpers<ProviderFormValues>
  ) => {
    const missing = missingRequired(values, detail, isCustom);

    // The server is asked only once what is required is there
    if (missing.length > 0) {
      setErrors(
        missing.reduce<Record<string, unknown>>((errors, path) => {
          const steps = path.split('.');
          let at = errors;

          steps.slice(0, -1).forEach((step) => {
            at = (at[step] ??= {}) as Record<string, unknown>;
          });
          at[steps[steps.length - 1]] = translatedErrors.required;

          return errors;
        }, {}) as FormErrors<ProviderFormValues>
      );

      return;
    }

    const body: ProviderUpdateBody = {
      enabled: values.enabled,
      clientId: values.clientId,
      scopes: toScopes(values.scopes),
      trustForLinking: values.trustForLinking,
      updateUserOnSignIn: values.updateUserOnSignIn,
      profileMapping: values.profileMapping.map(({ attribute, claim, when }) => ({
        attribute,
        claim,
        when,
      })),
      fields: Object.fromEntries(
        Object.entries(values.fields).map(([name, value]) => [name, value === '' ? null : value])
      ),
      ...(isCustom && { discoveryUrl: values.discoveryUrl }),
    };

    // A secret is sent only when a new one was typed: what is stored is never read back, so an
    // untouched one is left out and the server keeps it
    if (values.clientSecret !== '') {
      body.clientSecret = values.clientSecret;
    }

    for (const [name, secret] of Object.entries(values.secretFields)) {
      if (secret !== '') {
        body.fields = { ...body.fields, [name]: secret };
      }
    }

    const result = await update({ id: detail.id, body });

    if ('error' in result) {
      const errors = getFormErrors(result.error) as { fields?: Record<string, unknown> };
      const secretErrors: Record<string, unknown> = {};

      // The server names a secret field like any other; the form keeps what was typed apart
      for (const [name, field] of Object.entries(detail.definition.fields)) {
        if (field.type === 'secret' && errors.fields?.[name] !== undefined) {
          secretErrors[name] = errors.fields[name];
          delete errors.fields[name];
        }
      }

      const hasFieldErrors = Object.keys(errors).length > 0 || Object.keys(secretErrors).length > 0;

      setErrors({ ...errors, secretFields: secretErrors } as FormErrors<ProviderFormValues>);
      toggleNotification({
        type: 'danger',
        message: hasFieldErrors
          ? formatMessage({
              id: getTranslation('providers.save-failed'),
              defaultMessage: 'Check the fields marked with an error.',
            })
          : formatAPIError(result.error),
      });

      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
    });
    onClose();
  };

  return (
    <Form method="PUT" disabled={disabled} initialValues={initialValues} onSubmit={handleSubmit}>
      {({ isSubmitting }) => (
        <>
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={5}>
              {locked && (
                <Typography textColor="neutral600">
                  {formatMessage(
                    {
                      id: getTranslation('providers.locked.hint'),
                      defaultMessage:
                        'This provider is set in <code>config/plugins.ts</code>. Change it there.',
                    },
                    { code: (chunks: React.ReactNode) => <code>{chunks}</code> }
                  )}
                </Typography>
              )}

              <ToggleField
                name="enabled"
                label={formatMessage({
                  id: getTranslation('providers.enabled'),
                  defaultMessage: 'Enabled',
                })}
                disabled={disabled}
              />

              {isCustom && (
                <TextField
                  name="discoveryUrl"
                  type="url"
                  label={formatMessage({
                    id: getTranslation('providers.discovery-url'),
                    defaultMessage: 'Discovery URL',
                  })}
                  disabled={disabled}
                  required
                />
              )}

              <TextField
                name="clientId"
                label={formatMessage({
                  id: getTranslation('providers.client-id'),
                  defaultMessage: 'Client ID',
                })}
                disabled={disabled}
                required
              />

              <SecretInput
                name="clientSecret"
                label={formatMessage({
                  id: getTranslation('providers.client-secret'),
                  defaultMessage: 'Client secret',
                })}
                isSet={detail.clientSecretSet}
                disabled={disabled}
                required
              />

              <TextField
                name="scopes"
                label={formatMessage({
                  id: getTranslation('providers.scopes'),
                  defaultMessage: 'Scopes',
                })}
                hint={formatMessage({
                  id: getTranslation('providers.scopes.hint'),
                  defaultMessage: 'Separated by spaces.',
                })}
                disabled={disabled}
              />

              {Object.entries(detail.definition.fields).map(([name, field]) => (
                <DefinitionField
                  key={name}
                  name={name}
                  field={field}
                  detail={detail}
                  disabled={disabled}
                />
              ))}

              <Field.Root
                name="redirectUri"
                hint={formatMessage({
                  id: getTranslation('providers.redirect-uri.hint'),
                  defaultMessage:
                    'Give this to the identity provider. It is computed, so it is read-only.',
                })}
              >
                <Field.Label>
                  {formatMessage({
                    id: getTranslation('providers.redirect-uri'),
                    defaultMessage: 'Redirect URI',
                  })}
                </Field.Label>
                <TextInput
                  value={detail.redirectUri}
                  readOnly
                  endAction={
                    <IconButton
                      type="button"
                      variant="ghost"
                      label={formatMessage({
                        id: getTranslation('providers.redirect-uri.copy'),
                        defaultMessage: 'Copy redirect URI',
                      })}
                      onClick={handleCopy}
                    >
                      <Duplicate />
                    </IconButton>
                  }
                />
                <Field.Hint />
              </Field.Root>

              <ToggleField
                name="trustForLinking"
                label={formatMessage({
                  id: getTranslation('providers.trust-for-linking'),
                  defaultMessage: 'Trust for account linking',
                })}
                hint={formatMessage({
                  id: getTranslation('providers.trust-for-linking.hint'),
                  defaultMessage:
                    'A sign-in with this provider is linked to the existing account that has the same email. Turn it on only for a provider that checks emails.',
                })}
                disabled={disabled}
              />

              <ToggleField
                name="updateUserOnSignIn"
                label={formatMessage({
                  id: getTranslation('providers.update-user'),
                  defaultMessage: 'Update user details on each sign-in',
                })}
                hint={formatMessage({
                  id: getTranslation('providers.update-user.hint'),
                  defaultMessage:
                    'The name and image the provider sends replace the user’s on every sign-in. The email never changes this way.',
                })}
                disabled={disabled}
              />

              <ProfileMapping claims={claims} disabled={disabled} />
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary" type="button">
                {formatMessage({
                  id: disabled ? 'global.close' : 'app.components.Button.cancel',
                  defaultMessage: disabled ? 'Close' : 'Cancel',
                })}
              </Button>
            </Modal.Close>
            {!disabled && (
              <Button type="submit" loading={isSubmitting}>
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            )}
          </Modal.Footer>
        </>
      )}
    </Form>
  );
};

/** One provider's settings. A provider set in config opens locked, and never shows a secret. */
const ProviderModal = ({ id, canUpdate, onClose }: ProviderModalProps) => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetProviderQuery(id ?? '', { skip: id === null });

  return (
    <UnsavedChangesModal open={id !== null} onOpenChange={(open: boolean) => !open && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {data?.name ??
              formatMessage({
                id: getTranslation('providers.modal.title'),
                defaultMessage: 'Provider',
              })}
          </Modal.Title>
        </Modal.Header>
        {isLoading && (
          <Modal.Body>
            <Loader>{formatMessage({ id: 'app.utils.loading', defaultMessage: 'Loading' })}</Loader>
          </Modal.Body>
        )}
        {error && (
          <Modal.Body>
            <Typography textColor="danger600">
              {formatMessage({
                id: getTranslation('providers.modal.error'),
                defaultMessage: 'The provider could not be loaded.',
              })}
            </Typography>
          </Modal.Body>
        )}
        {data && (
          <ProviderForm key={data.id} detail={data} canUpdate={canUpdate} onClose={onClose} />
        )}
      </Modal.Content>
    </UnsavedChangesModal>
  );
};

export { ProviderModal };
export type { ProviderModalProps };
