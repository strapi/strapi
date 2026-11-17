import type {
  MfaEnforcementMode,
  MfaEnforcementSettings,
  PasskeySettings,
  TrustedDeviceSettings,
} from '../contracts/security-settings';

/**
 * The rules that decide whether a security-settings save relaxes protection. One copy, imported by
 * the server (`security-settings` service, the authority, which demands credentials) and by the
 * admin client (which only decides whether to ask for them before it saves), so the two cannot
 * drift into a client that saves without a prompt the server then refuses.
 *
 * Internal to the admin package; not part of any public export.
 */

const MODE_RANK: Record<MfaEnforcementMode, number> = { off: 0, optional: 1, required: 2 };

/**
 * The role flags that enforce anything. Under `off` the flags are kept, so a later raise can bring
 * them back, but they require nobody: dropping one relaxes nothing, and flagging one again puts
 * its holders on the clock as if it were new.
 */
export const enforcedRoleIds = (
  settings: Pick<MfaEnforcementSettings, 'mode' | 'requiredRoles'>
): string[] => (settings.mode === 'off' ? [] : settings.requiredRoles);

/** Lowering the mode, a longer grace period, or dropping an enforced role. A dropped role relaxes
 * nothing while the *resulting* mode is `required` (the mode alone covers every local-password
 * user), or when the previous mode was `off` (it required nobody). */
export const isSecurityDowngrade = (
  previous: MfaEnforcementSettings,
  next: MfaEnforcementSettings
): boolean => {
  if (MODE_RANK[next.mode] < MODE_RANK[previous.mode]) {
    return true;
  }

  const removedRole = enforcedRoleIds(previous).some((id) => !next.requiredRoles.includes(id));
  if (next.mode !== 'required' && removedRole) {
    return true;
  }

  return next.graceDays > previous.graceDays;
};

/** Offering trust, or lengthening it, lets a browser skip the second factor for longer. */
export const isTrustedDevicesDowngrade = (
  previous: TrustedDeviceSettings,
  next: TrustedDeviceSettings
): boolean => (!previous.enabled && next.enabled) || (next.enabled && next.days > previous.days);

/** Turning passkeys off deletes every one, irreversibly. Turning them on destroys nothing, which
 * is why only one direction is gated, unlike the trust period. */
export const isPasskeysDisable = (previous: PasskeySettings, next: PasskeySettings): boolean =>
  previous.enabled && !next.enabled;

/** Whether `mode` ranks above `than`. */
export const isModeAbove = (mode: MfaEnforcementMode, than: MfaEnforcementMode): boolean =>
  MODE_RANK[mode] > MODE_RANK[than];
