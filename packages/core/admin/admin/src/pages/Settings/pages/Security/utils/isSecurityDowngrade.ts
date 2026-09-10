import type {
  MfaEnforcementMode,
  MfaEnforcementSettings,
  PasskeySettings,
  TrustedDeviceSettings,
} from '../../../../../../../shared/contracts/security-settings';

const MODE_RANK: Record<MfaEnforcementMode, number> = { off: 0, optional: 1, required: 2 };

/**
 * Whether a settings change relaxes enforcement and therefore needs the caller's password (and a
 * code when they are enrolled) before the server accepts it. Mirrors `isDowngrade` in
 * `server/src/services/security-settings.ts` exactly; the server is the authority and refuses a
 * downgrade sent without credentials, this only decides whether to ask for them first.
 *
 * A role dropped from the required list only relaxes anything while the *resulting* mode is not
 * `required`: under `required` every local-password user is covered by the mode alone, so the
 * per-role list is inert.
 */
export const isSecurityDowngrade = (
  previous: MfaEnforcementSettings,
  next: MfaEnforcementSettings
): boolean => {
  if (MODE_RANK[next.mode] < MODE_RANK[previous.mode]) {
    return true;
  }

  const removedRole = previous.requiredRoles.some((id) => !next.requiredRoles.includes(id));
  if (next.mode !== 'required' && removedRole) {
    return true;
  }

  return next.graceDays > previous.graceDays;
};

/**
 * Cycle 3 twin of `isSecurityDowngrade`, for the trusted-devices card. Mirrors `widensTrust` in
 * the server's `updateSettings`: offering trust where none was offered, or promising a longer
 * trust while it is offered, both let a browser skip the second factor for longer than before.
 * Disabling or shortening only ever cuts trust short, so neither needs credentials.
 */
export const isTrustedDevicesDowngrade = (
  previous: TrustedDeviceSettings,
  next: TrustedDeviceSettings
): boolean => (!previous.enabled && next.enabled) || (next.enabled && next.days > previous.days);

/**
 * Cycle 4's third term in the same re-authentication predicate. Mirrors `disablesPasskeys` in the
 * server's `updateSettings`: turning passkeys off deletes every passkey every administrator has
 * registered, organisation-wide and irreversibly, so a stolen session must not be able to wipe
 * them all with one `PUT` and a dialog the attacker is not looking at.
 *
 * Turning passkeys **on** needs nothing: adding a phishing-resistant factor strengthens the
 * second factor and destroys nothing, which is why -- unlike cycle 3's trust period -- only one
 * direction is gated.
 */
export const isPasskeysDisable = (previous: PasskeySettings, next: PasskeySettings): boolean =>
  previous.enabled && !next.enabled;
