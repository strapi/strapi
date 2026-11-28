import type { AdminUserMfaState } from '../../../shared/contracts/user';

type MfaRequirement =
  | { kind: 'none' }
  /** The grace period starts at the user's next login. */
  | { kind: 'nextLogin' }
  | { kind: 'daysLeft'; days: number }
  /** Required with no time left: the account is locked, or its deadline has passed. */
  | { kind: 'required' };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How an account's two-factor requirement reads, shared by the users list and the user page so both
 * say the same thing. Nothing for an enrolled account or one that is not required. `requiredFallback`
 * lets the page supply what it worked out from the enforcement settings when the server did not
 * send `mfaRequired`.
 *
 * @internal
 */
export const getMfaRequirement = (
  user: Pick<AdminUserMfaState, 'mfaEnabledAt' | 'mfaGraceUntil' | 'mfaLockedAt' | 'mfaRequired'>,
  { now = Date.now(), requiredFallback }: { now?: number; requiredFallback?: boolean } = {}
): MfaRequirement => {
  if (user.mfaEnabledAt) {
    return { kind: 'none' };
  }

  if (user.mfaLockedAt) {
    return { kind: 'required' };
  }

  if (user.mfaGraceUntil) {
    const remaining = new Date(user.mfaGraceUntil).getTime() - now;

    return remaining > 0
      ? { kind: 'daysLeft', days: Math.ceil(remaining / DAY_MS) }
      : { kind: 'required' };
  }

  if (user.mfaRequired ?? requiredFallback) {
    return { kind: 'nextLogin' };
  }

  return { kind: 'none' };
};

export type { MfaRequirement };
