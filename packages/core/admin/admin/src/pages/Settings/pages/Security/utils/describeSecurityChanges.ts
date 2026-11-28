import { type IntlFormatters, type IntlShape } from 'react-intl';

import { enforcedRoleIds } from './isSecurityDowngrade';

import type {
  MfaEnforcementSettings,
  TrustedDeviceSettings,
} from '../../../../../../../shared/contracts/security-settings';

type FormatMessage = IntlFormatters['formatMessage'];
type FormatList = IntlShape['formatList'];

/**
 * The sentences the downgrade dialogs on the Security page use to name what a save changes. The
 * single-purpose dialogs ("Lower two-factor requirements?", "Let trusted devices skip the code for
 * longer?") and the combined "Lower security settings?" one share them, so a change reads the same
 * wherever it is confirmed.
 *
 * Enforcement wording, from the stored settings to the draft:
 * - required for everyone to not required: "...no longer be required for anyone."
 * - required for everyone to selected roles: "...no longer be required for everyone except {roles}."
 * - selected roles to not required, or fewer selected roles: "...no longer be required for
 *   {roles}." naming the roles dropped (an unknown role id is shown as is).
 * - a longer grace period adds its own sentence.
 */
export const describeEnforcementChanges = (
  previous: MfaEnforcementSettings,
  next: MfaEnforcementSettings,
  roles: Array<{ id: number | string; name: string }>,
  formatMessage: FormatMessage,
  formatList: FormatList
): string[] => {
  const lines: string[] = [];
  const roleNames = (ids: string[]) =>
    formatList(
      ids.map((id) => roles.find((role) => String(role.id) === id)?.name ?? id),
      { type: 'conjunction' }
    );

  if (previous.mode === 'required' && next.mode === 'off') {
    lines.push(
      formatMessage({
        id: 'Settings.security.downgrade.combined.anyone',
        defaultMessage: 'Two-factor authentication will no longer be required for anyone.',
      })
    );
  } else if (previous.mode === 'required' && next.mode === 'optional') {
    lines.push(
      next.requiredRoles.length > 0
        ? formatMessage(
            {
              id: 'Settings.security.downgrade.combined.everyoneExcept',
              defaultMessage:
                'Two-factor authentication will no longer be required for everyone except {roles}.',
            },
            { roles: roleNames(next.requiredRoles) }
          )
        : formatMessage({
            id: 'Settings.security.downgrade.combined.anyone',
            defaultMessage: 'Two-factor authentication will no longer be required for anyone.',
          })
    );
  } else if (next.mode !== 'required') {
    const dropped = enforcedRoleIds(previous).filter(
      (id) => next.mode === 'off' || !next.requiredRoles.includes(id)
    );
    if (dropped.length > 0) {
      lines.push(
        formatMessage(
          {
            id: 'Settings.security.downgrade.combined.roles',
            defaultMessage: 'Two-factor authentication will no longer be required for {roles}.',
          },
          { roles: roleNames(dropped) }
        )
      );
    }
  }

  if (next.mode !== 'off' && next.graceDays > previous.graceDays) {
    lines.push(
      formatMessage(
        {
          id: 'Settings.security.downgrade.combined.graceDays',
          defaultMessage:
            'Users will have {days, plural, one {# day} other {# days}} instead of {previous} to set up two-factor authentication.',
        },
        { days: next.graceDays, previous: previous.graceDays }
      )
    );
  }

  return lines;
};

/** The trust-period sentence: trust offered at all, or for longer than before. */
export const describeTrustChange = (
  previous: TrustedDeviceSettings,
  next: TrustedDeviceSettings,
  formatMessage: FormatMessage
): string =>
  previous.enabled
    ? formatMessage(
        {
          id: 'Settings.security.downgrade.combined.trustedDevices.longer',
          defaultMessage:
            'Trusted devices will skip the code for {newDays, plural, one {# day} other {# days}} instead of {oldDays}.',
        },
        { newDays: next.days, oldDays: previous.days }
      )
    : formatMessage(
        {
          id: 'Settings.security.downgrade.combined.trustedDevices.enabled',
          defaultMessage:
            'Users will be able to trust a device to skip the code for {days, plural, one {# day} other {# days}}.',
        },
        { days: next.days }
      );
