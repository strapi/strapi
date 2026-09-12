import type {
  MfaEnforcementMode,
  MfaEnforcementSettings,
  PasskeySettings,
  TrustedDeviceSettings,
} from '../../../../../../../shared/contracts/security-settings';

const MODE_RANK: Record<MfaEnforcementMode, number> = { off: 0, optional: 1, required: 2 };

/** The server is the authority; this only decides whether to ask for credentials first. A dropped
 * role relaxes nothing while the *resulting* mode is `required`. */
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

/** Offering trust, or lengthening it, lets a browser skip the second factor for longer. */
export const isTrustedDevicesDowngrade = (
  previous: TrustedDeviceSettings,
  next: TrustedDeviceSettings
): boolean => (!previous.enabled && next.enabled) || (next.enabled && next.days > previous.days);

/** Turning passkeys off deletes every one, irreversibly. Turning them on destroys nothing, which
 * is why only one direction is gated, unlike the trust period. */
export const isPasskeysDisable = (previous: PasskeySettings, next: PasskeySettings): boolean =>
  previous.enabled && !next.enabled;

/** An SSO-only actor is let through only when disabling passkeys is the ONLY term that tripped.
 * The other two are parameters, not baked in as `false`, so that narrowness is provable here. */
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
