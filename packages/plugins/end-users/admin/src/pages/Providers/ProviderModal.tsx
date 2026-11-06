import * as React from 'react';

import { useAPIErrorHandler, useClipboard, useNotification } from '@strapi/admin/strapi-admin';
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
  Toggle,
  Typography,
} from '@strapi/design-system';
import { Duplicate, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useGetProviderQuery, useUpdateProviderMutation } from '../../services/providers';
import { useGetProfileFieldsQuery } from '../../services/settings';
import { getTranslation } from '../../utils/getTranslation';
import { getFieldErrors } from '../../utils/validationErrors';

import type {
  ProfileMappingRow,
  ProfileMappingWhen,
  ProviderDetail,
  ProviderField,
  ProviderUpdateBody,
} from '../../../../shared/contracts/providers';

interface ProviderModalProps {
  /** The provider to open; the modal is open while there is one */
  id: string | null;
  /** Whether the admin may save: without it the modal reads like a locked provider */
  canUpdate: boolean;
  onClose: () => void;
}

type FieldValue = string | boolean;

/** One mapping row as edited, with a key that stays put while rows come and go */
interface EditedRow extends ProfileMappingRow {
  key: number;
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
  value,
  onChange,
  disabled,
  required,
  multiline,
  hint,
  error,
}: {
  name: string;
  label: string;
  isSet: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  required?: boolean;
  multiline?: boolean;
  hint?: string;
  error?: string;
}) => {
  const { formatMessage } = useIntl();
  const [replacing, setReplacing] = React.useState(false);
  const showInput = !disabled && (!isSet || replacing);

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
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
            <Button variant="tertiary" size="S" onClick={() => setReplacing(true)}>
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
  value,
  secret,
  onChange,
  onSecretChange,
  disabled,
  error,
}: {
  name: string;
  field: ProviderField;
  detail: ProviderDetail;
  value: FieldValue;
  secret: string;
  onChange: (value: FieldValue) => void;
  onSecretChange: (value: string) => void;
  disabled: boolean;
  error?: string;
}) => {
  const { formatMessage } = useIntl();
  const path = `fields.${name}`;

  if (field.type === 'secret') {
    const current = detail.fields[name];

    return (
      <SecretInput
        name={path}
        label={field.label}
        hint={field.hint}
        required={field.required}
        multiline={field.multiline}
        isSet={typeof current === 'object' && current !== null && current.set}
        value={secret}
        onChange={onSecretChange}
        disabled={disabled}
        error={error}
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <Field.Root name={path} error={error} hint={field.hint}>
        <Field.Label>{field.label}</Field.Label>
        <Toggle
          checked={value === true}
          disabled={disabled}
          onLabel={formatMessage({ id: getTranslation('settings.on'), defaultMessage: 'On' })}
          offLabel={formatMessage({ id: getTranslation('settings.off'), defaultMessage: 'Off' })}
          onChange={(event) => onChange(event.target.checked)}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }

  if (field.type === 'select') {
    return (
      <Field.Root name={path} error={error} hint={field.hint} required={field.required}>
        <Field.Label>{field.label}</Field.Label>
        <SingleSelect
          value={typeof value === 'string' && value !== '' ? value : undefined}
          disabled={disabled}
          onChange={(next) => onChange(String(next))}
        >
          {(field.options ?? []).map((option) => (
            <SingleSelectOption key={option} value={option}>
              {option}
            </SingleSelectOption>
          ))}
        </SingleSelect>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }

  return (
    <Field.Root name={path} error={error} hint={field.hint} required={field.required}>
      <Field.Label>{field.label}</Field.Label>
      {field.multiline ? (
        <Textarea
          value={String(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <TextInput
          type={field.type === 'url' ? 'url' : 'text'}
          value={String(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
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
  const [update, { isLoading: isSaving }] = useUpdateProviderMutation();
  const profileFields = useGetProfileFieldsQuery();

  // A provider from config is locked: nothing here can be changed
  const locked = detail.source === 'config';
  const disabled = locked || !canUpdate;
  const claims = detail.definition.claims ?? {};

  const [enabled, setEnabled] = React.useState(detail.enabled);
  const [clientId, setClientId] = React.useState(detail.clientId);
  const [clientSecret, setClientSecret] = React.useState('');
  const [scopes, setScopes] = React.useState(detail.scopes.join(' '));
  const [discoveryUrl, setDiscoveryUrl] = React.useState(detail.discoveryUrl ?? '');
  const [fields, setFields] = React.useState(() => initialFieldValues(detail));
  const [secretFields, setSecretFields] = React.useState<Record<string, string>>({});
  const [trustForLinking, setTrustForLinking] = React.useState(detail.trustForLinking);
  const [updateUserOnSignIn, setUpdateUserOnSignIn] = React.useState(detail.updateUserOnSignIn);
  const nextKey = React.useRef(detail.profileMapping.length);
  const [mapping, setMapping] = React.useState<EditedRow[]>(() =>
    detail.profileMapping.map((row, key) => ({ ...row, key }))
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isCustom = detail.kind === 'oidc' && detail.package === null;
  const attributes = profileFields.data ?? [];

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

  const setRow = (key: number, patch: Partial<ProfileMappingRow>) =>
    setMapping((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const handleSave = async () => {
    const body: ProviderUpdateBody = {
      enabled,
      clientId,
      scopes: toScopes(scopes),
      trustForLinking,
      updateUserOnSignIn,
      profileMapping: mapping.map(({ attribute, claim, when }) => ({ attribute, claim, when })),
      fields: Object.fromEntries(
        Object.entries(fields).map(([name, value]) => [name, value === '' ? null : value])
      ),
      ...(isCustom && { discoveryUrl }),
    };

    // A secret is sent only when a new one was typed: what is stored is never read back, so an
    // untouched one is left out and the server keeps it
    if (clientSecret !== '') {
      body.clientSecret = clientSecret;
    }

    for (const [name, secret] of Object.entries(secretFields)) {
      if (secret !== '') {
        body.fields = { ...body.fields, [name]: secret };
      }
    }

    const result = await update({ id: detail.id, body });

    if ('error' in result) {
      setErrors(getFieldErrors(result.error));
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });

      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
    });
    onClose();
  };

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

          <Field.Root name="enabled" error={errors.enabled}>
            <Field.Label>
              {formatMessage({
                id: getTranslation('providers.enabled'),
                defaultMessage: 'Enabled',
              })}
            </Field.Label>
            <Toggle
              checked={enabled}
              disabled={disabled}
              onLabel={formatMessage({ id: getTranslation('settings.on'), defaultMessage: 'On' })}
              offLabel={formatMessage({
                id: getTranslation('settings.off'),
                defaultMessage: 'Off',
              })}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <Field.Error />
          </Field.Root>

          {isCustom && (
            <Field.Root name="discoveryUrl" error={errors.discoveryUrl} required>
              <Field.Label>
                {formatMessage({
                  id: getTranslation('providers.discovery-url'),
                  defaultMessage: 'Discovery URL',
                })}
              </Field.Label>
              <TextInput
                type="url"
                value={discoveryUrl}
                disabled={disabled}
                onChange={(event) => setDiscoveryUrl(event.target.value)}
              />
              <Field.Error />
            </Field.Root>
          )}

          <Field.Root name="clientId" error={errors.clientId} required>
            <Field.Label>
              {formatMessage({
                id: getTranslation('providers.client-id'),
                defaultMessage: 'Client ID',
              })}
            </Field.Label>
            <TextInput
              value={clientId}
              disabled={disabled}
              onChange={(event) => setClientId(event.target.value)}
            />
            <Field.Error />
          </Field.Root>

          <SecretInput
            name="clientSecret"
            label={formatMessage({
              id: getTranslation('providers.client-secret'),
              defaultMessage: 'Client secret',
            })}
            isSet={detail.clientSecretSet}
            value={clientSecret}
            onChange={setClientSecret}
            disabled={disabled}
            required
            error={errors.clientSecret}
          />

          <Field.Root
            name="scopes"
            error={errors.scopes}
            hint={formatMessage({
              id: getTranslation('providers.scopes.hint'),
              defaultMessage: 'Separated by spaces.',
            })}
          >
            <Field.Label>
              {formatMessage({ id: getTranslation('providers.scopes'), defaultMessage: 'Scopes' })}
            </Field.Label>
            <TextInput
              value={scopes}
              disabled={disabled}
              onChange={(event) => setScopes(event.target.value)}
            />
            <Field.Hint />
            <Field.Error />
          </Field.Root>

          {Object.entries(detail.definition.fields).map(([name, field]) => (
            <DefinitionField
              key={name}
              name={name}
              field={field}
              detail={detail}
              value={fields[name] ?? ''}
              secret={secretFields[name] ?? ''}
              onChange={(value) => setFields((current) => ({ ...current, [name]: value }))}
              onSecretChange={(value) =>
                setSecretFields((current) => ({ ...current, [name]: value }))
              }
              disabled={disabled}
              error={errors[`fields.${name}`]}
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
            <Flex gap={2}>
              <Box grow={1}>
                <TextInput value={detail.redirectUri} readOnly />
              </Box>
              <IconButton
                label={formatMessage({
                  id: getTranslation('providers.redirect-uri.copy'),
                  defaultMessage: 'Copy redirect URI',
                })}
                onClick={handleCopy}
              >
                <Duplicate />
              </IconButton>
            </Flex>
            <Field.Hint />
          </Field.Root>

          <Field.Root name="trustForLinking" error={errors.trustForLinking}>
            <Field.Label>
              {formatMessage({
                id: getTranslation('providers.trust-for-linking'),
                defaultMessage: 'Trust for account linking',
              })}
            </Field.Label>
            <Toggle
              checked={trustForLinking}
              disabled={disabled}
              onLabel={formatMessage({ id: getTranslation('settings.on'), defaultMessage: 'On' })}
              offLabel={formatMessage({
                id: getTranslation('settings.off'),
                defaultMessage: 'Off',
              })}
              onChange={(event) => setTrustForLinking(event.target.checked)}
            />
            <Field.Error />
          </Field.Root>

          <Field.Root
            name="updateUserOnSignIn"
            error={errors.updateUserOnSignIn}
            hint={formatMessage({
              id: getTranslation('providers.update-user.hint'),
              defaultMessage:
                'The name and image the provider sends replace the user’s on every sign-in. The email never changes this way.',
            })}
          >
            <Field.Label>
              {formatMessage({
                id: getTranslation('providers.update-user'),
                defaultMessage: 'Update user details on each sign-in',
              })}
            </Field.Label>
            <Toggle
              checked={updateUserOnSignIn}
              disabled={disabled}
              onLabel={formatMessage({ id: getTranslation('settings.on'), defaultMessage: 'On' })}
              offLabel={formatMessage({
                id: getTranslation('settings.off'),
                defaultMessage: 'Off',
              })}
              onChange={(event) => setUpdateUserOnSignIn(event.target.checked)}
            />
            <Field.Hint />
            <Field.Error />
          </Field.Root>

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
            {mapping.map((row, index) => {
              const claimOptions = Object.entries(claims).map(([key, claim]) => ({
                value: key,
                label: claim.label,
              }));

              if (row.claim !== '' && !(row.claim in claims)) {
                claimOptions.push({ value: row.claim, label: row.claim });
              }

              return (
                <Flex key={row.key} gap={2} alignItems="flex-end">
                  <Box grow={1}>
                    <Field.Root
                      name={`profileMapping.${index}.attribute`}
                      error={errors[`profileMapping.${index}.attribute`]}
                    >
                      <Field.Label>
                        {formatMessage({
                          id: getTranslation('providers.mapping.attribute'),
                          defaultMessage: 'Profile attribute',
                        })}
                      </Field.Label>
                      <SingleSelect
                        value={row.attribute === '' ? undefined : row.attribute}
                        disabled={disabled}
                        onChange={(next) => setRow(row.key, { attribute: String(next) })}
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
                    <Field.Root
                      name={`profileMapping.${index}.claim`}
                      error={errors[`profileMapping.${index}.claim`]}
                    >
                      <Field.Label>
                        {formatMessage({
                          id: getTranslation('providers.mapping.claim'),
                          defaultMessage: 'Claim',
                        })}
                      </Field.Label>
                      <Combobox
                        creatable
                        value={row.claim === '' ? undefined : row.claim}
                        disabled={disabled}
                        placeholder=""
                        onChange={(next) => setRow(row.key, { claim: next ? String(next) : '' })}
                        onCreateOption={(next) => next && setRow(row.key, { claim: next })}
                        onClear={() => setRow(row.key, { claim: '' })}
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
                    <Field.Root
                      name={`profileMapping.${index}.when`}
                      error={errors[`profileMapping.${index}.when`]}
                    >
                      <Field.Label>
                        {formatMessage({
                          id: getTranslation('providers.mapping.when'),
                          defaultMessage: 'When',
                        })}
                      </Field.Label>
                      <SingleSelect
                        value={row.when}
                        disabled={disabled}
                        onChange={(next) =>
                          setRow(row.key, { when: String(next) as ProfileMappingWhen })
                        }
                      >
                        {WHEN.map((when) => (
                          <SingleSelectOption key={when} value={when}>
                            {whenLabels[when]}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                      <Field.Error />
                    </Field.Root>
                  </Box>
                  {!disabled && (
                    <IconButton
                      label={formatMessage(
                        {
                          id: getTranslation('providers.mapping.remove'),
                          defaultMessage: 'Remove mapping row {number}',
                        },
                        { number: index + 1 }
                      )}
                      variant="ghost"
                      onClick={() =>
                        setMapping((rows) => rows.filter((one) => one.key !== row.key))
                      }
                    >
                      <Trash />
                    </IconButton>
                  )}
                </Flex>
              );
            })}
            {!disabled && (
              <Box>
                <Button
                  variant="tertiary"
                  startIcon={<Plus />}
                  onClick={() => {
                    nextKey.current += 1;
                    setMapping((rows) => [
                      ...rows,
                      { key: nextKey.current, attribute: '', claim: '', when: 'sign-up' },
                    ]);
                  }}
                >
                  {formatMessage({
                    id: getTranslation('providers.mapping.add'),
                    defaultMessage: 'Add mapping',
                  })}
                </Button>
              </Box>
            )}
          </Flex>
        </Flex>
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close>
          <Button variant="tertiary">
            {formatMessage({
              id: disabled ? 'global.close' : 'app.components.Button.cancel',
              defaultMessage: disabled ? 'Close' : 'Cancel',
            })}
          </Button>
        </Modal.Close>
        {!disabled && (
          <Button loading={isSaving} onClick={handleSave}>
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        )}
      </Modal.Footer>
    </>
  );
};

/** One provider's settings. A provider set in config opens locked, and never shows a secret. */
const ProviderModal = ({ id, canUpdate, onClose }: ProviderModalProps) => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetProviderQuery(id ?? '', { skip: id === null });

  return (
    <Modal.Root open={id !== null} onOpenChange={(open: boolean) => !open && onClose()}>
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
    </Modal.Root>
  );
};

export { ProviderModal };
export type { ProviderModalProps };
