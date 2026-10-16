import * as React from 'react';

import {
  Box,
  Button,
  Checkbox,
  Dialog,
  Field,
  Flex,
  Link,
  Radio,
  TextInput,
  Typography,
} from '@strapi/design-system';
import isEqual from 'lodash/isEqual';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { ErrorMessage } from '../../../../../components/ErrorMessage';
import { Panel } from '../../../../../components/Panel';
import { useToMessage } from '../../../../../hooks/useToMessage';
import { useLazyGetMfaImpactQuery } from '../../../../../services/securitySettings';
import { useSecuritySettingsSave } from '../hooks/useSecuritySettingsSave';
import { isEnforcementRaise, isSecurityDowngrade } from '../utils/isSecurityDowngrade';

import { ConfirmDowngradeDialog } from './ConfirmDowngradeDialog';

import type {
  MfaEnforcementMode,
  MfaEnforcementSettings,
} from '../../../../../../../shared/contracts/security-settings';
import type { AdminRole } from '../../../../../hooks/useAdminRoles';

interface TwoFactorEnforcementCardProps {
  settings: MfaEnforcementSettings;
  roles: AdminRole[];
  canUpdate: boolean;
  /** `/admin/mfa/me` `enabled` for the caller: decides whether a downgrade also needs a code. */
  callerEnrolled: boolean;
  /**
   * `/admin/mfa/me` `hasLocalPassword`. An account with no password is exempt from enforcement, so
   * the enrol-first guard never applies to it. Defaults to true, the conservative reading.
   */
  callerHasLocalPassword?: boolean;
  /** The caller's own role ids, to tell whether a role being required includes one they hold. */
  callerRoleIds?: string[];
  /**
   * `isFetching` of the `SecuritySettings` query, while it refetches after this card's own save.
   * Keeps Save disabled through the gap between the mutation fulfilling and the refetched
   * `settings` prop catching up to `draft`, which would otherwise let a fast second click
   * re-submit the same body.
   */
  isRefreshing?: boolean;
}

const GRACE_MIN = 1;
const GRACE_MAX = 30;

/** Spelled out rather than built from a template id, so each string is greppable and extractable,
 * and the fallback is the same whole sentence a translator sees. */
const MODE_MESSAGES: Record<MfaEnforcementMode, MessageDescriptor> = {
  off: {
    id: 'Settings.security.mfa.mode.off',
    defaultMessage:
      'Off. Nobody is required to use two-factor authentication. Users who enrolled still get a code prompt at login.',
  },
  optional: {
    id: 'Settings.security.mfa.mode.optional',
    defaultMessage:
      'Optional. Only users with one of the roles selected below are required to enrol.',
  },
  required: {
    id: 'Settings.security.mfa.mode.required',
    defaultMessage: 'Required. Every user who logs in with a password is required to enrol.',
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
 * Save is on the card, not the page header: each card saves its own object.
 */
const byRoleId = (a: string, b: string) => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

const TwoFactorEnforcementCard = ({
  settings,
  roles,
  canUpdate,
  callerEnrolled,
  callerHasLocalPassword = true,
  callerRoleIds = [],
  isRefreshing = false,
}: TwoFactorEnforcementCardProps) => {
  const { formatMessage } = useIntl();
  const modeLabelId = React.useId();
  const rolesLabelId = React.useId();
  const titleId = React.useId();

  const [draft, setDraft] = React.useState<MfaEnforcementSettings>(settings);
  // `graceDays` is kept separately as the raw field value so an empty or out-of-range entry can
  // be shown as a validation error instead of being coerced away.
  const [graceDays, setGraceDays] = React.useState<number | null>(settings.graceDays);
  const [graceError, setGraceError] = React.useState<string>();

  // The baseline the draft was last taken from. A refetch adopts fresh server data only while the
  // draft still matches it: an edit in progress is kept rather than silently thrown away, which is
  // what happened when another administrator saved enforcement while this one was typing.
  const baselineRef = React.useRef(settings);
  React.useEffect(() => {
    const baseline = baselineRef.current;
    baselineRef.current = settings;

    setDraft((current) => (isEqual(current, baseline) ? settings : current));
    setGraceDays((current) => (current === baseline.graceDays ? settings.graceDays : current));
  }, [settings]);

  // An empty grace field reads as the stored value, so `isSecurityDowngrade` never sees the
  // empty state and never mistakes it for a lengthened period. `validate()` below is what
  // actually refuses the save; this only keeps `next` a well-formed settings object.
  const next: MfaEnforcementSettings = {
    ...draft,
    graceDays: graceDays ?? settings.graceDays,
  };
  // Both role lists are ordered before comparing: the server returns them in its own order, which
  // must not read as an unsaved change. Comparing `next` to `settings` directly would leave Save
  // permanently enabled. These are opaque ids, so the comparator only has to be the same on both
  // sides -- it is not trying to order them meaningfully.
  const modified = !isEqual(
    { ...next, requiredRoles: [...next.requiredRoles].sort(byRoleId) },
    { ...settings, requiredRoles: [...settings.requiredRoles].sort(byRoleId) }
  );

  const { save, isSaving, saveError, downgradeOpen, closeDowngrade, confirmDowngrade } =
    useSecuritySettingsSave({
      patch: { mfa: next },
      requiresCredentials: isSecurityDowngrade(settings, next),
      validate: () => {
        if (!isValidGraceDays(graceDays)) {
          setGraceError(
            formatMessage(
              {
                id: 'Settings.security.mfa.graceDays.error',
                defaultMessage: 'Enter a whole number of days between {min} and {max}',
              },
              { min: GRACE_MIN, max: GRACE_MAX }
            )
          );
          return false;
        }
        setGraceError(undefined);
        return true;
      },
    });

  /**
   * The server refuses to require two-factor authentication of a caller who has none: the most
   * obvious self-lockout. It used to say so only after Save. The same rule is evaluated here so the
   * refusal arrives as a next step, before the click -- the server stays the authority.
   */
  const addsHeldRole = next.requiredRoles.some(
    (id) => !settings.requiredRoles.includes(id) && callerRoleIds.includes(id)
  );
  const mustEnrolFirst =
    !callerEnrolled &&
    callerHasLocalPassword &&
    ((next.mode === 'required' && settings.mode !== 'required') ||
      (next.mode === 'optional' && addsHeldRole));

  /**
   * Raising enforcement is the change with a blast radius -- it can put every password user in the
   * organisation on a lockout clock -- so it confirms first, showing how many people and how long
   * they have. The credential gate is for the opposite direction and stays as it is.
   */
  const toMessage = useToMessage();
  const [fetchImpact, { isFetching: isFetchingImpact }] = useLazyGetMfaImpactQuery();
  const [impact, setImpact] = React.useState<{ affected: number; enrolled: number } | null>(null);
  const [impactError, setImpactError] = React.useState<string>();

  const handleSave = async () => {
    if (!isEnforcementRaise(settings, next)) {
      await save();
      return;
    }
    setImpactError(undefined);
    const res = await fetchImpact({ mode: next.mode, requiredRoles: next.requiredRoles });
    if (res.error) {
      setImpactError(toMessage(res.error));
      return;
    }
    if (res.data) {
      setImpact(res.data);
    }
  };

  const confirmRaise = async () => {
    setImpact(null);
    await save();
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
          <Typography
            variant="pi"
            fontWeight="bold"
            textColor="neutral800"
            tag="p"
            id={modeLabelId}
          >
            {formatMessage({
              id: 'Settings.security.mfa.mode.label',
              defaultMessage: 'Requirement',
            })}
          </Typography>
          <Radio.Group
            aria-labelledby={modeLabelId}
            name="mfa-mode"
            value={draft.mode}
            disabled={!canUpdate}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, mode: value as MfaEnforcementMode }))
            }
          >
            <Flex direction="column" alignItems="stretch" gap={2}>
              {(Object.keys(MODE_MESSAGES) as MfaEnforcementMode[]).map((mode) => (
                <Radio.Item key={mode} value={mode}>
                  {formatMessage(MODE_MESSAGES[mode])}
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
          <Typography
            variant="pi"
            fontWeight="bold"
            textColor="neutral800"
            tag="p"
            id={rolesLabelId}
          >
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
          <Flex
            tag="ul"
            role="list"
            aria-labelledby={rolesLabelId}
            direction="column"
            alignItems="stretch"
            gap={2}
          >
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

        <ErrorMessage error={impactError} />
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
        <Flex justifyContent="flex-end">
          <Button
            onClick={handleSave}
            loading={isSaving || isFetchingImpact}
            disabled={!canUpdate || !modified || isRefreshing || mustEnrolFirst}
          >
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        </Flex>

        <Dialog.Root open={impact !== null} onOpenChange={(open) => !open && setImpact(null)}>
          {impact !== null ? (
            <ConfirmDialog
              title={formatMessage({
                id: 'Settings.security.mfa.enforce.title',
                defaultMessage: 'Require two-factor authentication?',
              })}
              variant="default"
              onConfirm={confirmRaise}
            >
              {impact.affected === 0
                ? formatMessage({
                    id: 'Settings.security.mfa.enforce.none',
                    defaultMessage:
                      'No active user signs in with a password under this setting, so nobody will be asked to set it up yet.',
                  })
                : formatMessage(
                    {
                      id: 'Settings.security.mfa.enforce.body',
                      defaultMessage:
                        '{affected, plural, one {# user} other {# users}} will be asked to set up two-factor authentication, and {enrolled, plural, =0 {none of them has} one {# of them already has} other {# of them already have}} it. Each has {graceDays, plural, one {# day} other {# days}} from their next sign-in to set it up. After that, password sign-in is locked until an administrator unlocks the account.',
                    },
                    {
                      affected: impact.affected,
                      enrolled: impact.enrolled,
                      graceDays: next.graceDays,
                    }
                  )}
            </ConfirmDialog>
          ) : null}
        </Dialog.Root>

        <ConfirmDowngradeDialog
          open={downgradeOpen}
          requiresCode={callerEnrolled}
          onClose={closeDowngrade}
          onConfirm={confirmDowngrade}
        />
      </Panel>
    </Box>
  );
};

export { TwoFactorEnforcementCard };
export type { TwoFactorEnforcementCardProps };
