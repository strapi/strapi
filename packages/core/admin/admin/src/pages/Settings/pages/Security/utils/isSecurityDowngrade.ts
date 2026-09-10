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
 * Trusted-devices twin of `isSecurityDowngrade`. Mirrors `widensTrust` in the server's
 * `updateSettings`: offering trust where none was offered, or promising a longer
 * trust while it is offered, both let a browser skip the second factor for longer than before.
 * Disabling or shortening only ever cuts trust short, so neither needs credentials.
 */
export const isTrustedDevicesDowngrade = (
  previous: TrustedDeviceSettings,
  next: TrustedDeviceSettings
): boolean => (!previous.enabled && next.enabled) || (next.enabled && next.days > previous.days);

/**
 * The third term in the same re-authentication predicate. Mirrors `disablesPasskeys` in the
 * server's `updateSettings`: turning passkeys off deletes every passkey every administrator has
 * registered, organisation-wide and irreversibly, so a stolen session must not be able to wipe
 * them all with one `PUT` and a dialog the attacker is not looking at.
 *
 * Turning passkeys **on** needs nothing: adding a phishing-resistant factor strengthens the
 * second factor and destroys nothing, which is why -- unlike the trust period -- only one
 * direction is gated.
 */
export const isPasskeysDisable = (previous: PasskeySettings, next: PasskeySettings): boolean =>
  previous.enabled && !next.enabled;

/**
 * Whether a save that disables passkeys needs the caller's credentials, for a caller who may have
 * no local password at all (an SSO-only administrator). Mirrors `updateSettings`'s exemption:
 * a password-less actor is let through with no credentials only when disabling passkeys is the
 * ONLY term that tripped. Combined with either of the other two, the server still demands
 * credentials the actor cannot supply and refuses outright. A password-holding actor always
 * needs credentials.
 *
 * `PasskeysCard`'s own `PUT` can only ever trip the passkeys term -- its patch never carries
 * `mfa` or `trustedDevices` -- so the other two are always `false` for its calls. They are
 * parameters rather than baked in as `false` so the exemption's narrowness is provable directly,
 * rather than only by the shape of this card's patch.
 */
export const requiresPasskeysCredentials = (
  hasLocalPassword: boolean,
  disablesPasskeys: boolean,
  lowersEnforcement = false,
  widensTrust = false
): boolean => {
  if (!disablesPasskeys && !lowersEnforcement && !widensTrust) {
    return false;
  }
  return hasLocalPassword || lowersEnforcement || widensTrust;
};
