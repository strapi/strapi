import * as React from 'react';

import {
  Box,
  Field,
  Flex,
  Link,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { ErrorMessage } from '../../../../../components/ErrorMessage';
import { Panel } from '../../../../../components/Panel';

import type {
  MfaEnforcementMode,
  MfaEnforcementSettings,
} from '../../../../../../../shared/contracts/security-settings';
import type { AdminRole } from '../../../../../hooks/useAdminRoles';

/** The card's slice of the page draft. `graceDays` is the raw field value, so an empty or
 * out-of-range entry can be shown as a validation error instead of being coerced away. */
interface MfaEnforcementDraft extends Omit<MfaEnforcementSettings, 'graceDays'> {
  graceDays: number | null;
}

interface TwoFactorEnforcementCardProps {
  value: MfaEnforcementDraft;
  onChange: (value: MfaEnforcementDraft) => void;
  roles: AdminRole[];
  canUpdate: boolean;
  /** Field errors from the page's validation, shown under their field. */
  errors?: { graceDays?: string; requiredRoles?: string };
  /** A refused save that concerns this card only (or the raise's impact lookup failing). */
  saveError?: string;
  /**
   * The server refuses to require two-factor authentication of a caller who has none. The page
   * evaluates the same rule before Save so the refusal arrives as a next step; this shows it.
   */
  mustEnrolFirst?: boolean;
}

const GRACE_MIN = 1;
const GRACE_MAX = 30;

const MODES: MfaEnforcementMode[] = ['off', 'optional', 'required'];

/** Spelled out rather than built from a template id, so each string is greppable and extractable,
 * and the fallback is the same whole sentence a translator sees. */
const MODE_LABELS: Record<MfaEnforcementMode, MessageDescriptor> = {
  off: { id: 'Settings.security.mfa.mode.off', defaultMessage: 'Not required' },
  optional: {
    id: 'Settings.security.mfa.mode.optional',
    defaultMessage: 'Required for selected roles',
  },
  required: { id: 'Settings.security.mfa.mode.required', defaultMessage: 'Required for everyone' },
};

/** Only what the option label leaves out; "Required for selected roles" says it all. */
const MODE_HINTS: Partial<Record<MfaEnforcementMode, MessageDescriptor>> = {
  off: {
    id: 'Settings.security.mfa.mode.off.hint',
    defaultMessage: 'Users who already set up two-factor authentication still enter a code.',
  },
  required: {
    id: 'Settings.security.mfa.mode.required.hint',
    defaultMessage: 'Applies to everyone who logs in with a password.',
  },
};

const isValidGraceDays = (value: number | null) =>
  value !== null && Number.isInteger(value) && value >= GRACE_MIN && value <= GRACE_MAX;

/**
 * The first card on the Security page: who must use two-factor authentication. It holds no state
 * of its own; the page owns the draft of all three cards and saves them with its one header Save
 * (see `useSecuritySettingsSave`). The role picker shows only under "Required for selected roles",
 * and the grace period only while something is required.
 */
const TwoFactorEnforcementCard = ({
  value: draft,
  onChange,
  roles,
  canUpdate,
  errors = {},
  saveError,
  mustEnrolFirst = false,
}: TwoFactorEnforcementCardProps) => {
  const { formatMessage } = useIntl();
  const titleId = React.useId();
  const modeHint = MODE_HINTS[draft.mode];

  return (
    // `Panel` hardcodes its own outer `Box` and forwards props only to the inner `Flex`, so a
    // `tag` given to it would land inside the panel rather than on its root. The `section`
    // landmark goes on this wrapper, which adds no styling of its own.
    <Box tag="section" aria-labelledby={titleId}>
      <Panel gap={5}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography variant="delta" tag="h2" id={titleId}>
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
          <Box maxWidth="32rem">
            <Field.Root name="mfaMode" hint={modeHint ? formatMessage(modeHint) : undefined}>
              <Field.Label>
                {formatMessage({
                  id: 'Settings.security.mfa.mode.label',
                  defaultMessage: 'Requirement',
                })}
              </Field.Label>
              <SingleSelect
                disabled={!canUpdate}
                value={draft.mode}
                onChange={(mode) => onChange({ ...draft, mode: mode as MfaEnforcementMode })}
              >
                {MODES.map((mode) => (
                  <SingleSelectOption key={mode} value={mode}>
                    {formatMessage(MODE_LABELS[mode])}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
              <Field.Hint />
            </Field.Root>
          </Box>
          <ErrorMessage error={saveError} />
        </Flex>

        {draft.mode === 'optional' ? (
          <Box maxWidth="32rem">
            <Field.Root
              name="mfaRequiredRoles"
              required
              error={errors.requiredRoles}
              hint={formatMessage(
                {
                  id: 'Settings.security.mfa.roles.hint',
                  defaultMessage:
                    "Members of these roles must set up two-factor authentication. You can also set this on each role's page in <link>Settings > Roles</link>.",
                },
                {
                  link: (chunks: React.ReactNode) => (
                    <Link tag={NavLink} to="/settings/roles" isExternal={false}>
                      {chunks}
                    </Link>
                  ),
                }
              )}
            >
              <Field.Label>
                {formatMessage({
                  id: 'Settings.security.mfa.roles.label',
                  defaultMessage: 'Require for these roles',
                })}
              </Field.Label>
              <MultiSelect
                withTags
                disabled={!canUpdate}
                value={draft.requiredRoles}
                onChange={(requiredRoles) => onChange({ ...draft, requiredRoles })}
                placeholder={formatMessage({
                  id: 'app.components.Select.placeholder',
                  defaultMessage: 'Select',
                })}
              >
                {roles.map((role) => (
                  <MultiSelectOption key={role.id} value={String(role.id)}>
                    {formatMessage(
                      {
                        id: 'Settings.security.mfa.roles.option',
                        defaultMessage: '{name} ({count, plural, one {# user} other {# users}})',
                      },
                      { name: role.name, count: role.usersCount ?? 0 }
                    )}
                  </MultiSelectOption>
                ))}
              </MultiSelect>
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Box>
        ) : null}

        {draft.mode !== 'off' ? (
          <Box maxWidth="24rem">
            <Field.Root
              name="graceDays"
              required
              error={errors.graceDays}
              hint={formatMessage({
                id: 'Settings.security.mfa.graceDays.hint',
                defaultMessage: 'Days a user has to set up 2FA after their first login.',
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
               * timing the admin's own Renderer tests call untestable, while
               * `<input type="number">` is a spinbutton whose value the tests can type into
               * directly. The value is a string here and parsed once below.
               */}
              <TextInput
                type="number"
                inputMode="numeric"
                min={GRACE_MIN}
                max={GRACE_MAX}
                step={1}
                disabled={!canUpdate}
                value={draft.graceDays ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  onChange({ ...draft, graceDays: raw === '' ? null : Number(raw) });
                }}
              />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Box>
        ) : null}

        {mustEnrolFirst ? (
          <Typography variant="pi" textColor="neutral600">
            {formatMessage(
              {
                id: 'Settings.security.mfa.enrolFirst.hint',
                defaultMessage:
                  'Set up two-factor authentication on your own account before requiring it for others. <link>Go to your profile</link>.',
              },
              {
                link: (chunks: React.ReactNode) => (
                  <Link tag={NavLink} to="/me" isExternal={false}>
                    {chunks}
                  </Link>
                ),
              }
            )}
          </Typography>
        ) : null}
      </Panel>
    </Box>
  );
};

export { TwoFactorEnforcementCard, GRACE_MIN, GRACE_MAX, isValidGraceDays };
export type { MfaEnforcementDraft, TwoFactorEnforcementCardProps };
