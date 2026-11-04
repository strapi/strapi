import {
  enforcedRoleIds,
  isModeAbove,
  isPasskeysDisable,
  isSecurityDowngrade,
  isTrustedDevicesDowngrade,
} from '../../../../../../../shared/utils/security-downgrade';

import type { MfaEnforcementSettings } from '../../../../../../../shared/contracts/security-settings';

/** The downgrade rules are shared with the server, which is the authority; the client only uses
 * them to decide whether to ask for credentials first. */
export { enforcedRoleIds, isPasskeysDisable, isSecurityDowngrade, isTrustedDevicesDowngrade };

/**
 * Whether a save could put someone *new* on the enforcement clock: the mode rises out of `off`
 * or up to `required`, or `optional` gains a role. That is the change with a blast radius, so it
 * gets a consequence confirmation -- not a credential gate, which is for the opposite direction.
 * A shorter grace period or a dropped role puts nobody new on the clock.
 */
export const isEnforcementRaise = (
  previous: MfaEnforcementSettings,
  next: MfaEnforcementSettings
): boolean => {
  if (next.mode === 'off') {
    return false;
  }
  if (isModeAbove(next.mode, previous.mode)) {
    return true;
  }
  return (
    next.mode === 'optional' &&
    next.requiredRoles.some((id) => !previous.requiredRoles.includes(id))
  );
};

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
