import type {
  MfaEnforcementMode,
  MfaEnforcementSettings,
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
