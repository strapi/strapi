import * as React from 'react';

import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Radio,
  TextInput,
  Typography,
} from '@strapi/design-system';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';

import { useNotification } from '../../../../../features/Notifications';
import { useUpdateSecuritySettingsMutation } from '../../../../../services/securitySettings';
import { ErrorMessage, useToMessage } from '../../../../Profile/DialogUtils';
import { isSecurityDowngrade } from '../utils/isSecurityDowngrade';

import { ConfirmDowngradeDialog, type DowngradeCredentials } from './ConfirmDowngradeDialog';

import type {
  MfaEnforcementMode,
  MfaEnforcementSettings,
} from '../../../../../../../shared/contracts/security-settings';
import type { AdminRole } from '../../../../../hooks/useAdminRoles';

interface TwoFactorEnforcementCardProps {
  /** The stored settings, as `GET /admin/security-settings` returned them. */
  settings: MfaEnforcementSettings;
  roles: AdminRole[];
  canUpdate: boolean;
  /** `/admin/mfa/me` `enabled` for the caller: decides whether a downgrade also needs a code. */
  callerEnrolled: boolean;
}

const GRACE_MIN = 1;
const GRACE_MAX = 30;

const MODE_COPY: Record<MfaEnforcementMode, { label: string; description: string }> = {
  off: {
    label: 'Off',
    description:
      'Nobody is required to use two-factor authentication. Users who enrolled still get a code prompt at login.',
  },
  optional: {
    label: 'Optional',
    description: 'Only users with one of the roles selected below are required to enrol.',
  },
  required: {
    label: 'Required',
    description: 'Every user who logs in with a password is required to enrol.',
  },
};

const isValidGraceDays = (value: number | null) =>
  value !== null && Number.isInteger(value) && value >= GRACE_MIN && value <= GRACE_MAX;

/**
 * The first card on the Security page. Owns a draft of the `mfa` object and saves it whole
 * (`PUT /admin/security-settings` takes no partial update). Raising protection saves directly;
 * a downgrade (`isSecurityDowngrade`) first collects the caller's password, and a code when they
 * are enrolled, through `ConfirmDowngradeDialog`. Server refusals (the enrol-first guard, an
 * unknown role, refused credentials) show inline under the mode options; a successful save
 * toasts "Saved" and the invalidated `SecuritySettings` query hands back the stored result,
 * which the effect below adopts as the new baseline.
 *
 * Save is on the card, not the page header, because later security settings are meant to become
 * further cards, each saving its own object.
 */
const TwoFactorEnforcementCard = ({
  settings,
  roles,
  canUpdate,
  callerEnrolled,
}: TwoFactorEnforcementCardProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSecuritySettingsMutation();

  const [draft, setDraft] = React.useState<MfaEnforcementSettings>(settings);
  // `graceDays` is kept separately as the raw field value so an empty or out-of-range entry can
  // be shown as a validation error instead of being coerced away.
  const [graceDays, setGraceDays] = React.useState<number | null>(settings.graceDays);
  const [graceError, setGraceError] = React.useState<string>();
  const [saveError, setSaveError] = React.useState<string>();
  const [downgradeOpen, setDowngradeOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(settings);
    setGraceDays(settings.graceDays);
  }, [settings]);

  const next: MfaEnforcementSettings = {
    ...draft,
    graceDays: graceDays ?? settings.graceDays,
  };
  const modified = !isEqual(
    { ...next, requiredRoles: [...next.requiredRoles].sort() },
    { ...settings, requiredRoles: [...settings.requiredRoles].sort() }
  );

  const submit = async (credentials?: DowngradeCredentials): Promise<string | undefined> => {
    const res = await updateSettings({ mfa: next, ...credentials });
    if ('error' in res) {
      return toMessage(res.error);
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
    });
    return undefined;
  };

  const handleSave = async () => {
    setSaveError(undefined);
    if (!isValidGraceDays(graceDays)) {
      setGraceError(
        formatMessage({
          id: 'Settings.security.mfa.graceDays.error',
          defaultMessage: 'Enter a whole number of days between 1 and 30',
        })
      );
      return;
    }
    setGraceError(undefined);

    if (isSecurityDowngrade(settings, next)) {
      setDowngradeOpen(true);
      return;
    }

    const message = await submit();
    if (message) {
      setSaveError(message);
    }
  };

  const handleDowngradeConfirm = async (credentials: DowngradeCredentials) => {
    const message = await submit(credentials);
    if (!message) {
      setDowngradeOpen(false);
    }
    return message;
  };

  const toggleRole = (id: string, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      requiredRoles: checked
        ? [...prev.requiredRoles, id]
        : prev.requiredRoles.filter((roleId) => roleId !== id),
    }));
  };

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography variant="delta" tag="h2">
            {formatMessage({
              id: 'Settings.security.mfa.title',
              defaultMessage: 'Two-factor authentication',
            })}
          </Typography>
          <Typography textColor="neutral600">
            {formatMessage({
              id: 'Settings.security.mfa.description',
              defaultMessage:
                'Decide who must protect their account with a second factor. Two-factor authentication applies to password logins only.',
            })}
          </Typography>
        </Flex>

        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography
            variant="pi"
            fontWeight="bold"
            textColor="neutral800"
            tag="p"
            id="mfa-mode-label"
          >
            {formatMessage({
              id: 'Settings.security.mfa.mode.label',
              defaultMessage: 'Requirement',
            })}
          </Typography>
          <Radio.Group
            aria-labelledby="mfa-mode-label"
            name="mfa-mode"
            value={draft.mode}
            disabled={!canUpdate}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, mode: value as MfaEnforcementMode }))
            }
          >
            <Flex direction="column" alignItems="stretch" gap={2}>
              {(Object.keys(MODE_COPY) as MfaEnforcementMode[]).map((mode) => (
                <Radio.Item key={mode} value={mode}>
                  {formatMessage({
                    id: `Settings.security.mfa.mode.${mode}`,
                    defaultMessage: `${MODE_COPY[mode].label}. ${MODE_COPY[mode].description}`,
                  })}
                </Radio.Item>
              ))}
            </Flex>
          </Radio.Group>
          <ErrorMessage error={saveError} />
        </Flex>

        <Box maxWidth="24rem">
          <Field.Root
            name="graceDays"
            required
            error={graceError}
            hint={formatMessage({
              id: 'Settings.security.mfa.graceDays.hint',
              defaultMessage:
                'How long a required user can keep logging in before their account is locked for password login. Counted from their first login after the requirement applies.',
            })}
          >
            <Field.Label>
              {formatMessage({
                id: 'Settings.security.mfa.graceDays.label',
                defaultMessage: 'Grace period (days)',
              })}
            </Field.Label>
            {/*
             * A native number input rather than the design system's `NumberInput`: that one
             * renders a text field (role textbox, `inputMode="decimal"`) whose parse/commit
             * timing the admin's own Renderer tests call untestable, while `<input type="number">`
             * is a spinbutton whose value the tests can type into directly. The value is a string
             * here and parsed once below.
             */}
            <TextInput
              type="number"
              inputMode="numeric"
              min={GRACE_MIN}
              max={GRACE_MAX}
              step={1}
              disabled={!canUpdate}
              value={graceDays ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const raw = e.target.value;
                setGraceDays(raw === '' ? null : Number(raw));
                setGraceError(undefined);
              }}
            />
            <Field.Hint />
            <Field.Error />
          </Field.Root>
        </Box>

        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral800" tag="p">
            {formatMessage({
              id: 'Settings.security.mfa.roles.label',
              defaultMessage: 'Require for these roles',
            })}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {draft.mode === 'required'
              ? formatMessage({
                  id: 'Settings.security.mfa.roles.inert',
                  defaultMessage:
                    'Under Required, every user with a password must enrol regardless of role. This list applies when the requirement is Optional.',
                })
              : formatMessage({
                  id: 'Settings.security.mfa.roles.hint',
                  defaultMessage:
                    'Members of a selected role must set up two-factor authentication within the grace period.',
                })}
          </Typography>
          <Flex tag="ul" role="list" direction="column" alignItems="stretch" gap={2}>
            {roles.map((role) => {
              const id = String(role.id);
              const count = role.usersCount ?? 0;
              return (
                <Box tag="li" key={id}>
                  <Checkbox
                    name={`mfa-role-${id}`}
                    disabled={!canUpdate}
                    checked={draft.requiredRoles.includes(id)}
                    onCheckedChange={(checked) => toggleRole(id, checked === true)}
                  >
                    {formatMessage(
                      {
                        id: 'Settings.security.mfa.roles.option',
                        defaultMessage: '{name} ({count, plural, one {# user} other {# users}})',
                      },
                      { name: role.name, count }
                    )}
                  </Checkbox>
                </Box>
              );
            })}
          </Flex>
        </Flex>

        <Flex justifyContent="flex-end">
          <Button onClick={handleSave} loading={isSaving} disabled={!canUpdate || !modified}>
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        </Flex>
      </Flex>

      <ConfirmDowngradeDialog
        open={downgradeOpen}
        requiresCode={callerEnrolled}
        onClose={() => setDowngradeOpen(false)}
        onConfirm={handleDowngradeConfirm}
      />
    </Box>
  );
};

export { TwoFactorEnforcementCard };
export type { TwoFactorEnforcementCardProps };
