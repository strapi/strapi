import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  errors,
  generateRecoveryCodes,
  generateTotpSecret,
  normaliseRecoveryCode,
  verifyTotp,
} from '@strapi/utils';
import type { Core } from '@strapi/types';
import { MFA_DEFAULTS, validateMfaConfig, type MfaConfig } from '../config/mfa';

const { ApplicationError, ValidationError } = errors;

export const FUTURE_FLAG = 'unstableAdminMfa';

const USER_UID = 'admin::user';
const RECOVERY_CODE_UID = 'admin::mfa-recovery-code';

interface EncryptionLike {
  encrypt(value: string): string | null;
  decrypt(value: string): string | null;
}

interface AuthLike {
  validatePassword(password: string, hash: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
}

export interface MfaServiceDeps {
  strapi: Core.Strapi;
  encryption: EncryptionLike;
  auth: AuthLike;
}

/**
 * Native TOTP two-factor authentication for admin users.
 *
 * Organised in four groups, extended by later tasks:
 *  - Config & status: `isEnabled`, `config`, `isEnrolled`.
 *  - Enrolment: `beginEnrolment`, `completeEnrolment`.
 *  - Verification primitives: `verifyTotpForUser`, `consumeTotpStep`, the atomic replay guard
 *    shared by enrolment and, later, challenge verification (Task 7).
 *  - Recovery codes (Task 6): `issueRecoveryCodes`, `consumeRecoveryCode`,
 *    `countUnusedRecoveryCodes` — the single-use fallback for when the authenticator app is
 *    unavailable, consumed with the same atomic replay-guard shape as `consumeTotpStep`.
 */
const createMfaService = ({ strapi, encryption, auth }: MfaServiceDeps) => {
  let cachedConfig: MfaConfig | null = null;

  const config = (): MfaConfig => {
    if (!cachedConfig) {
      cachedConfig = validateMfaConfig(
        strapi.config.get('admin.auth.mfa', MFA_DEFAULTS),
        strapi.log
      );
    }
    return cachedConfig;
  };

  /**
   * The feature is off unless the future flag is on AND the config kill switch is on.
   * `enabled: false` means nobody is challenged and nobody is locked out; enrolment data is
   * left intact so re-enabling restores the previous state.
   */
  const isEnabled = (): boolean =>
    strapi.features.future.isEnabled(FUTURE_FLAG) && config().enabled;

  const userQuery = () => strapi.db.query(USER_UID);

  const loadUser = async (userId: string) => {
    const user = await userQuery().findOne({ where: { id: userId } });
    if (!user) {
      throw new ValidationError('User not found');
    }
    return user;
  };

  const isEnrolled = async (userId: string): Promise<boolean> => {
    const user = await userQuery().findOne({ where: { id: userId } });
    return Boolean(user?.mfaEnabledAt && user?.mfaSecret);
  };

  /**
   * Decrypts the stored secret, turning any way it can go wrong — a missing/rotated key, a
   * corrupted or hand-edited value, an unsupported version tag — into the same actionable
   * per-user error. `encryption.decrypt` throws raw `Error`s for malformed input instead of
   * returning null for every failure mode, and `base32Decode` throws on non-base32 plaintext, so
   * both must be inside the same guard or a malformed stored value becomes an unhandled 500.
   */
  const readSecret = (user: { mfaSecret?: string | null }): Buffer => {
    if (!user.mfaSecret) {
      throw new ValidationError('Two-factor authentication is not set up for this account');
    }

    let secret: Buffer | null = null;
    try {
      const decrypted = encryption.decrypt(user.mfaSecret);
      if (decrypted) {
        secret = base32Decode(decrypted);
      }
    } catch {
      secret = null;
    }

    if (!secret) {
      throw new ApplicationError(
        'The stored two-factor secret could not be read. This usually means the admin encryption key changed. Use a recovery code, or reset this user with `strapi admin:reset-user-mfa`.'
      );
    }

    return secret;
  };

  const beginEnrolment = async (userId: string, password: string) => {
    const user = await loadUser(userId);

    const passwordOk = await auth.validatePassword(password, user.password);
    if (!passwordOk) {
      throw new ValidationError('Invalid credentials');
    }

    // Refuse rather than overwrite: for an already-enrolled account, silently replacing the
    // secret while leaving mfaEnabledAt set would break their existing authenticator while
    // still demanding a code, locking them out. And doing it unconditionally would let anyone
    // holding just the password disable 2FA on someone else's account by starting enrolment and
    // never finishing it (mfaEnabledAt gets reset to null below) — the exact bypass 2FA exists
    // to prevent. The user must disable two-factor authentication first, then enrol again.
    if (user.mfaEnabledAt) {
      throw new ValidationError(
        'Two-factor authentication is already enabled for this account. Disable it first, then enrol again.'
      );
    }

    const secret = generateTotpSecret();
    const encoded = base32Encode(secret);
    const encrypted = encryption.encrypt(encoded);

    if (!encrypted) {
      throw new ApplicationError(
        'Cannot enable two-factor authentication because the admin encryption key is not configured. Set ENCRYPTION_KEY and restart.'
      );
    }

    // mfaEnabledAt stays null: an issued-but-unverified secret is not an enrolment, and the
    // next attempt simply overwrites it, so an abandoned flow needs no cleanup.
    await userQuery().update({
      where: { id: userId },
      data: { mfaSecret: encrypted, mfaEnabledAt: null, mfaLastUsedStep: null },
    });

    return {
      secret: encoded,
      otpauthUri: buildOtpauthUri({
        secret,
        label: user.email,
        issuer: config().issuer ?? strapi.config.get('info.name', 'Strapi'),
        digits: config().digits,
        step: config().step,
      }),
    };
  };

  const verifyTotpForUser = async (userId: string, code: string) => {
    const user = await loadUser(userId);
    const secret = readSecret(user);
    const { digits, step, window } = config();

    return verifyTotp({ secret, code, digits, step, window });
  };

  /**
   * The replay guard. A single conditional UPDATE whose affected-row count is the decision, so
   * two concurrent requests carrying the same code cannot both succeed. Never read-then-write:
   * that would leave a window between the check and the write for a second request to slip
   * through.
   */
  const consumeTotpStep = async (userId: string, step: number): Promise<boolean> => {
    const metadata = strapi.db.metadata.get(USER_UID);
    const { tableName } = metadata;
    // @ts-expect-error - no dynamic typings for the models, columnName only exists on scalar
    // attributes and mfaLastUsedStep's static type is the full Attribute union. Optional
    // chaining also guards the case where the attribute itself is missing (e.g. a migration
    // that hasn't run), which would otherwise throw a TypeError before the check below can
    // raise the intended, actionable ApplicationError.
    const lastUsedStepColumn: string | undefined = metadata.attributes.mfaLastUsedStep?.columnName;

    if (!lastUsedStepColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::user.mfaLastUsedStep'
      );
    }

    const affected = await strapi.db
      .connection(tableName)
      .where({ id: userId })
      .where((builder) =>
        builder.whereNull(lastUsedStepColumn).orWhere(lastUsedStepColumn, '<', step)
      )
      .update({ [lastUsedStepColumn]: step });

    return affected === 1;
  };

  const completeEnrolment = async (userId: string, code: string) => {
    const result = await verifyTotpForUser(userId, code);
    if (!result.valid) {
      throw new ValidationError('Invalid code');
    }

    const consumed = await consumeTotpStep(userId, result.step);
    if (!consumed) {
      throw new ValidationError('Invalid code');
    }

    await userQuery().update({ where: { id: userId }, data: { mfaEnabledAt: new Date() } });

    return { recoveryCodes: await issueRecoveryCodes(userId) };
  };

  // --- Recovery codes ---------------------------------------------------
  // A single-use fallback for when the authenticator app is unavailable (device lost, secret
  // undecryptable after an ENCRYPTION_KEY rotation, etc). One row per code so consumption is a
  // conditional row update, the same replay-guard shape as `consumeTotpStep`.

  const recoveryQuery = () => strapi.db.query(RECOVERY_CODE_UID);

  /**
   * Recovery codes are hashed with the same password hasher the admin already uses for admin
   * user passwords, because ASVS 6.5.2 requires a password-storage hash with a salt for secrets
   * under 112 bits of entropy, and these codes carry only 50. Crucially, bcrypt's per-hash salt
   * makes this independent of the encryption key: rotating `ENCRYPTION_KEY` makes every TOTP
   * secret undecryptable, and if recovery codes died with it the user would lose their escape
   * hatch at the exact moment they needed it. The plaintext is returned to the caller once here
   * and never stored — only the hash is persisted, and it must never reach a log either.
   */
  const issueRecoveryCodes = async (userId: string): Promise<string[]> => {
    const codes = generateRecoveryCodes(config().recoveryCodeCount);
    const data = await Promise.all(
      codes.map(async (code) => ({
        userId: String(userId),
        codeHash: await auth.hashPassword(code),
        usedAt: null,
      }))
    );

    // Regenerating replaces the whole set: previously issued codes must stop working, so the old
    // rows are deleted rather than left around as consumable leftovers.
    await recoveryQuery().deleteMany({ where: { userId: String(userId) } });
    await recoveryQuery().createMany({ data });

    return codes;
  };

  const countUnusedRecoveryCodes = (userId: string): Promise<number> =>
    recoveryQuery().count({ where: { userId: String(userId), usedAt: null } });

  /**
   * The replay guard for recovery codes, matching `consumeTotpStep`'s shape: verification (which
   * candidate hash matches) is separated from the atomic consume (a single conditional UPDATE
   * whose affected-row count is the decision), so two concurrent requests carrying the same code
   * cannot both succeed. Never read-then-write: that would leave a window between the check and
   * the write for a second request to slip through.
   */
  const consumeRecoveryCode = async (userId: string, code: string): Promise<boolean> => {
    const normalised = normaliseRecoveryCode(code);
    if (!normalised) {
      return false;
    }

    const candidates = await recoveryQuery().findMany({
      where: { userId: String(userId), usedAt: null },
    });

    for (const candidate of candidates) {
      // Sequential rather than parallel: bcrypt is deliberately slow and this endpoint is rate
      // limited, so there is no reason to burn every comparison once one matches.
      // eslint-disable-next-line no-await-in-loop
      const matches = await auth.validatePassword(normalised, candidate.codeHash);
      if (!matches) {
        continue;
      }

      const metadata = strapi.db.metadata.get(RECOVERY_CODE_UID);
      const { tableName } = metadata;
      // @ts-expect-error - no dynamic typings for the models, columnName only exists on scalar
      // attributes and usedAt's static type is the full Attribute union. Optional chaining also
      // guards the case where the attribute itself is missing (e.g. a migration that hasn't
      // run), which would otherwise throw a TypeError before the check below can raise the
      // intended, actionable ApplicationError.
      const usedAtColumn: string | undefined = metadata.attributes.usedAt?.columnName;

      if (!usedAtColumn) {
        throw new ApplicationError(
          'Could not resolve the physical column name for admin::mfa-recovery-code.usedAt'
        );
      }

      // Conditional update: whoever flips usedAt from null wins, so a code cannot be spent twice
      // by two concurrent requests.
      const affected = await strapi.db
        .connection(tableName)
        .where({ id: candidate.id })
        .whereNull(usedAtColumn)
        .update({ [usedAtColumn]: new Date() });

      return affected === 1;
    }

    return false;
  };

  return {
    isEnabled,
    config,
    isEnrolled,
    beginEnrolment,
    completeEnrolment,
    verifyTotpForUser,
    consumeTotpStep,
    issueRecoveryCodes,
    consumeRecoveryCode,
    countUnusedRecoveryCodes,
  };
};

export default createMfaService;
