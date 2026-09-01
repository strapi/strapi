import type { Core } from '@strapi/types';

export type MfaConfig = Required<Omit<NonNullable<Core.Config.Admin['auth']['mfa']>, 'issuer'>> & {
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

/**
 * Validates the MFA config. Every outcome is a warning: values that would break authenticator
 * interoperability fall back to the default, values that merely weaken security are honoured
 * because that is the operator's decision to make.
 */
export const validateMfaConfig = (raw: unknown, logger: Logger): MfaConfig => {
  const input = (raw ?? {}) as Partial<MfaConfig>;
  const result: MfaConfig = {
    ...MFA_DEFAULTS,
    ...input,
    window: { ...MFA_DEFAULTS.window, ...(input.window ?? {}) },
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

  if (!Number.isFinite(result.maxChallengeAttempts) || result.maxChallengeAttempts < 0) {
    logger.warn(
      `${PREFIX} maxChallengeAttempts must be a non-negative number. Got ${result.maxChallengeAttempts}, using ${MFA_DEFAULTS.maxChallengeAttempts}.`
    );
    result.maxChallengeAttempts = MFA_DEFAULTS.maxChallengeAttempts;
  }

  if (!Number.isFinite(result.maxUserAttempts) || result.maxUserAttempts < 0) {
    logger.warn(
      `${PREFIX} maxUserAttempts must be a non-negative number. Got ${result.maxUserAttempts}, using ${MFA_DEFAULTS.maxUserAttempts}.`
    );
    result.maxUserAttempts = MFA_DEFAULTS.maxUserAttempts;
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
