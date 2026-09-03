import type { Core } from '@strapi/types';

export type MfaConfig = Required<
  Omit<NonNullable<Core.Config.Admin['auth']['mfa']>, 'issuer' | 'emailTemplate'>
> & {
  issuer?: string;
};

export const MFA_DEFAULTS: MfaConfig = {
  enabled: true,
  digits: 6,
  step: 30,
  window: { back: 1, forward: 0 },
  challengeTtl: 300,
  maxChallengeAttempts: 5,
  maxUserAttempts: 10,
  userAttemptWindow: 900,
  recoveryCodeCount: 10,
};

interface Logger {
  warn(message: string): void;
}

const PREFIX = '[admin.auth.mfa]';

/** A non-null, non-array object -- anything else spreads into indexed keys instead of settings. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Validates the MFA config. Every outcome is a warning: values that would break authenticator
 * interoperability fall back to the default, values that merely weaken security are honoured
 * because that is the operator's decision to make.
 */
export const validateMfaConfig = (raw: unknown, logger: Logger): MfaConfig => {
  // A string or an array is truthy and passes straight through `raw ?? {}` below, then gets cast
  // to `Partial<MfaConfig>` and spread over the defaults -- which does not merge settings, it
  // spreads characters/elements onto indexed string keys ("0", "1", ...) of the result. Caught
  // here, before that spread, rather than letting it produce a config nobody asked for.
  let safeRaw: unknown = raw;
  if (raw !== undefined && raw !== null && !isPlainObject(raw)) {
    logger.warn(
      `${PREFIX} config must be a plain object. Got ${
        Array.isArray(raw) ? 'an array' : typeof raw
      }, using the defaults.`
    );
    safeRaw = {};
  }

  const input = (safeRaw ?? {}) as Partial<MfaConfig>;
  const result: MfaConfig = {
    ...MFA_DEFAULTS,
    ...input,
    window: { ...MFA_DEFAULTS.window, ...input.window },
  };

  // Interop breakers: warn and fall back.
  if (![6, 7, 8].includes(result.digits)) {
    logger.warn(
      `${PREFIX} digits must be 6, 7 or 8 for authenticator app compatibility. Got ${result.digits}, using ${MFA_DEFAULTS.digits}.`
    );
    result.digits = MFA_DEFAULTS.digits;
  }

  if (!Number.isFinite(result.step) || result.step <= 0) {
    logger.warn(
      `${PREFIX} step must be a positive number of seconds. Got ${result.step}, using ${MFA_DEFAULTS.step}.`
    );
    result.step = MFA_DEFAULTS.step;
  }

  // Nonsense values: warn and fall back.
  if (!Number.isFinite(result.window.back) || result.window.back < 0) {
    logger.warn(
      `${PREFIX} window.back must be a non-negative number. Got ${result.window.back}, using ${MFA_DEFAULTS.window.back}.`
    );
    result.window.back = MFA_DEFAULTS.window.back;
  }

  if (!Number.isFinite(result.window.forward) || result.window.forward < 0) {
    logger.warn(
      `${PREFIX} window.forward must be a non-negative number. Got ${result.window.forward}, using ${MFA_DEFAULTS.window.forward}.`
    );
    result.window.forward = MFA_DEFAULTS.window.forward;
  }

  // Not merely nonsense: `new Date(Date.now() + NaN * 1000)` is an Invalid Date, so every
  // challenge would be born already expired and no user could ever complete a second factor.
  // A zero or negative TTL has the same effect, which is why this mirrors `step`'s positive
  // check rather than the non-negative one used for the counters below.
  if (!Number.isFinite(result.challengeTtl) || result.challengeTtl <= 0) {
    logger.warn(
      `${PREFIX} challengeTtl must be a positive number of seconds; anything else expires every challenge the moment it is created, locking everyone out of the second factor. Got ${result.challengeTtl}, using ${MFA_DEFAULTS.challengeTtl}.`
    );
    result.challengeTtl = MFA_DEFAULTS.challengeTtl;
  }

  // Zero is rejected alongside negative and non-finite values, deliberately -- a `< 0` floor (the
  // same class of bug `challengeTtl`/`userAttemptWindow` are guarded against above) would let a
  // config typo of `0` straight through. `maxChallengeAttempts: 0` makes the per-challenge
  // conditional increment's own cap condition (`attempts < 0`) impossible to satisfy, so every
  // verify reports `exhausted` before a code is ever checked.
  if (!Number.isFinite(result.maxChallengeAttempts) || result.maxChallengeAttempts < 1) {
    logger.warn(
      `${PREFIX} maxChallengeAttempts must be a positive number; anything else rejects every code on every challenge before it is checked, since the per-challenge attempt cap can never be satisfied. Got ${result.maxChallengeAttempts}, using ${MFA_DEFAULTS.maxChallengeAttempts}.`
    );
    result.maxChallengeAttempts = MFA_DEFAULTS.maxChallengeAttempts;
  }

  // Same reasoning as `maxChallengeAttempts` above, for the account-scoped tier:
  // `maxUserAttempts: 0` makes `isAccountThrottled`'s `failures >= maxUserAttempts` true for every
  // account (0 recorded failures >= 0), so every challenge create returns 429 and every verify
  // reports `throttled` -- an enrolled admin is locked out by a config typo before ever presenting
  // a code.
  if (!Number.isFinite(result.maxUserAttempts) || result.maxUserAttempts < 1) {
    logger.warn(
      `${PREFIX} maxUserAttempts must be a positive number; anything else throttles every account immediately, since the account-scoped failure count is never below it. Got ${result.maxUserAttempts}, using ${MFA_DEFAULTS.maxUserAttempts}.`
    );
    result.maxUserAttempts = MFA_DEFAULTS.maxUserAttempts;
  }

  // The rolling window the account-scoped attempt counter looks back over. A non-finite or
  // non-positive value makes `createdAt > now - window` match nothing, so the counter always
  // reads zero and the account-scoped throttle NIST SP 800-63B requires is silently disabled —
  // leaving only the per-challenge cap, which an attacker bypasses by creating a fresh
  // challenge after every few guesses. Operators who want a looser account tier raise
  // `maxUserAttempts`; a zero-length window is never what they meant.
  if (!Number.isFinite(result.userAttemptWindow) || result.userAttemptWindow <= 0) {
    logger.warn(
      `${PREFIX} userAttemptWindow must be a positive number of seconds; anything else silently disables the account-scoped attempt throttle. Got ${result.userAttemptWindow}, using ${MFA_DEFAULTS.userAttemptWindow}.`
    );
    result.userAttemptWindow = MFA_DEFAULTS.userAttemptWindow;
  }

  if (!Number.isFinite(result.recoveryCodeCount) || result.recoveryCodeCount < 0) {
    logger.warn(
      `${PREFIX} recoveryCodeCount must be a non-negative number. Got ${result.recoveryCodeCount}, using ${MFA_DEFAULTS.recoveryCodeCount}.`
    );
    result.recoveryCodeCount = MFA_DEFAULTS.recoveryCodeCount;
  }

  // Security wideners: warn and honour.
  if (result.window.back > 1 || result.window.forward > 1) {
    logger.warn(
      `${PREFIX} window wider than 1 step multiplies the brute force surface: every extra step adds another simultaneously valid code. Honouring back=${result.window.back} forward=${result.window.forward}.`
    );
  }

  if (result.maxChallengeAttempts > 10) {
    logger.warn(
      `${PREFIX} maxChallengeAttempts is ${result.maxChallengeAttempts}, which allows that many guesses per challenge. Honouring it.`
    );
  }

  if (result.maxUserAttempts > 100) {
    logger.warn(
      `${PREFIX} maxUserAttempts is ${result.maxUserAttempts}, above the 100 consecutive failures NIST SP 800-63B allows. Honouring it.`
    );
  }

  if (result.recoveryCodeCount > 20) {
    logger.warn(
      `${PREFIX} recoveryCodeCount is ${result.recoveryCodeCount}. Each code adds a bcrypt comparison to an unauthenticated request. Honouring it.`
    );
  }

  return result;
};
