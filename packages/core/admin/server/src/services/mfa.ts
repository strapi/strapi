import crypto from 'node:crypto';
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

const { ApplicationError, RateLimitError, ValidationError } = errors;

export const FUTURE_FLAG = 'unstableAdminMfa';

const USER_UID = 'admin::user';
const RECOVERY_CODE_UID = 'admin::mfa-recovery-code';
const CHALLENGE_UID = 'admin::mfa-challenge';
const EVENT_UID = 'admin::mfa-event';

/**
 * `validateMfaConfig` pins `digits` to 6, 7 or 8, and `verifyTotp` requires exactly `digits`
 * characters, so nothing longer than this can ever satisfy a TOTP check.
 */
const MAX_TOTP_CODE_LENGTH = 8;

/**
 * `generateRecoveryCode` emits exactly 10 Crockford base32 characters, and `normaliseRecoveryCode`
 * only ever removes separators or maps a character 1:1, so a genuine recovery code always
 * normalises to exactly this length.
 */
const RECOVERY_CODE_LENGTH = 10;

/**
 * Security notices surfaced in-app, and — for `challenge_failed` — the stored counter the
 * account-scoped throttle reads. Never carries the code, secret or URI it is about.
 */
export type MfaEventType =
  | 'enabled'
  | 'disabled'
  | 'reset'
  | 'challenge_failed'
  | 'recovery_code_used';

/**
 * `unusable`  — no such challenge, already spent, or expired. Nothing was evaluated.
 * `throttled` — the account-scoped window is full. Nothing was evaluated.
 * `exhausted` — this challenge's own attempt cap was already reached; it has been destroyed.
 * `invalid`   — an attempt was evaluated and neither factor matched.
 *
 * Only `ok: true` means a second factor was satisfied. The four failure reasons exist to let the
 * caller phrase a message, not to be treated as degrees of success.
 */
export type VerifyChallengeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'unusable' | 'exhausted' | 'invalid' | 'throttled' };

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
 *  - Challenge lifecycle (Task 7): `createChallenge`, `verifyChallenge`, `recordEvent`,
 *    `isAccountThrottled`, `sweepExpiredChallenges` — the only code that decides whether a second
 *    factor was satisfied, and the two-tier attempt limiting that stops brute force.
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

    // Issued before `mfaEnabledAt` is flipped, not after: if this throws (a constraint
    // violation, a dropped connection), the safe direction is to leave the user unenrolled and
    // free to retry, rather than enrolled with an empty recovery-code set and no way to get one
    // (no regenerate endpoint exists until Task 10). The consumed TOTP step stays consumed
    // either way — that is the safe outcome, not something to unwind.
    const recoveryCodes = await issueRecoveryCodes(userId);

    await userQuery().update({ where: { id: userId }, data: { mfaEnabledAt: new Date() } });

    return { recoveryCodes };
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
    // rows are deleted rather than left around as consumable leftovers. Wrapped in a transaction
    // so the delete and the insert either both land or neither does — a `createMany` failure
    // (constraint violation, dropped connection) must never strand the delete having already
    // committed, which would leave the account with zero recovery codes and no way to get any.
    await strapi.db.transaction(async () => {
      await recoveryQuery().deleteMany({ where: { userId: String(userId) } });

      // `recoveryCodeCount: 0` is a valid, if unusual, config (disables the fallback entirely).
      // `createMany({ data: [] })` against an empty array is not a case worth trusting every
      // query engine to no-op correctly, so skip it outright rather than assume.
      if (data.length > 0) {
        await recoveryQuery().createMany({ data });
      }
    });

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

    // Resolved once per call, before any candidate is even fetched, rather than inside the
    // match branch below: a schema or migration problem must surface deterministically on every
    // call, not only when a user happens to submit a code that matches — a wrong code silently
    // returning `false` while masking a broken column mapping would be worse than raising here.
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

  // --- Challenge lifecycle and two-tier rate limiting -------------------
  // A challenge is the short-lived record of "this password has been accepted, a second factor is
  // outstanding". It grants nothing by itself and authorises exactly one operation.
  //
  // Two tiers, because either alone is a bypass:
  //  - per challenge (`maxChallengeAttempts`), exact, enforced by one conditional UPDATE. Running
  //    it out destroys the challenge and sends the user back to their password.
  //  - per account (`maxUserAttempts` within `userAttemptWindow`), approximate, counted from
  //    stored `challenge_failed` events. The per-challenge cap alone would let an attacker
  //    holding a valid password create a fresh challenge after every few guesses and try
  //    forever; NIST SP 800-63B requires the limit be scoped to the account. It is a rolling
  //    window and self-clearing — never a permanent lockout.
  //
  // Expiry is enforced lazily on read (`sweepExpiredChallenges` is only housekeeping), so a
  // sweep that never runs cannot make a stale challenge usable.

  const challengeQuery = () => strapi.db.query(CHALLENGE_UID);
  const eventQuery = () => strapi.db.query(EVENT_UID);

  /**
   * Physical names for the two raw statements in this group, resolved from metadata for the same
   * reasons as `consumeTotpStep` and `consumeRecoveryCode`: the raw connection speaks columns, not
   * attributes, and a schema or migration problem must surface as an actionable error rather than
   * as a `TypeError` or, far worse, as an UPDATE that silently affects nothing and therefore
   * reads as "cap already reached".
   */
  const challengeTable = () => {
    const metadata = strapi.db.metadata.get(CHALLENGE_UID);
    const { tableName } = metadata;
    // @ts-expect-error - no dynamic typings for the models, columnName only exists on scalar
    // attributes and attempts' static type is the full Attribute union. Optional chaining also
    // guards the case where the attribute itself is missing (e.g. a migration that hasn't run),
    // which would otherwise throw a TypeError before the check below can raise the intended,
    // actionable ApplicationError.
    const attemptsColumn: string | undefined = metadata.attributes.attempts?.columnName;

    if (!attemptsColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::mfa-challenge.attempts'
      );
    }

    return { tableName, attemptsColumn };
  };

  /**
   * Metadata is neutral context only — never a code, a secret, an otpauth URI or anything derived
   * from them. These rows are readable wherever admin data is readable and are surfaced back to
   * the user in-app, so a "helpful" note about which code was tried would be storing a credential
   * in a table nobody thinks of as credential storage.
   */
  const recordEvent = async (
    userId: string,
    type: MfaEventType,
    metadata: Record<string, unknown> = {}
  ): Promise<void> => {
    await eventQuery().create({ data: { userId: String(userId), type, metadata, seenAt: null } });
  };

  /**
   * The account-scoped tier. Being a `COUNT` over a rolling window it is approximate under
   * concurrency — a handful of simultaneous requests can each see the same pre-write count — and
   * that is acceptable here: it is a backstop against sustained recycling, while the exact limit
   * on any single challenge is the conditional increment in `verifyChallenge`.
   */
  const isAccountThrottled = async (userId: string): Promise<boolean> => {
    const { maxUserAttempts, userAttemptWindow } = config();
    const since = new Date(Date.now() - userAttemptWindow * 1000);

    const failures = await eventQuery().count({
      where: { userId: String(userId), type: 'challenge_failed', createdAt: { $gt: since } },
    });

    return failures >= maxUserAttempts;
  };

  const createChallenge = async (userId: string): Promise<{ token: string; expiresIn: number }> => {
    // Checked here as well as in `verifyChallenge`: throttling only one of the two leaves the
    // other as the way around it.
    if (await isAccountThrottled(userId)) {
      throw new RateLimitError();
    }

    const { challengeTtl } = config();
    // 32 bytes from a CSPRNG. This token is the only thing between an accepted password and a
    // session, so it is sized as a credential even though it authorises just one operation.
    const token = crypto.randomBytes(32).toString('hex');

    await challengeQuery().create({
      data: {
        token,
        userId: String(userId),
        factorType: 'totp',
        attempts: 0,
        expiresAt: new Date(Date.now() + challengeTtl * 1000),
        consumedAt: null,
      },
    });

    return { token, expiresIn: challengeTtl };
  };

  /**
   * Spends the challenge. A single unconditional-looking DELETE is in fact the conditional
   * consume: whoever removes the row wins, so a token cannot authorise two operations even if two
   * concurrent requests each present a genuinely valid factor.
   */
  const consumeChallenge = async (id: unknown, userId: string): Promise<VerifyChallengeResult> => {
    const { tableName } = challengeTable();
    const affected = await strapi.db.connection(tableName).where({ id }).del();

    return affected === 1
      ? { ok: true as const, userId }
      : { ok: false as const, reason: 'unusable' as const };
  };

  /**
   * TOTP verification for this endpoint only, where a secret that cannot be read must mean "this
   * code did not match" rather than a fatal error.
   *
   * `verifyTotpForUser` throws for an undecryptable secret (an `ENCRYPTION_KEY` rotation) or a
   * missing one, and that error's own message tells the user to use a recovery code. Letting it
   * propagate from `verifyChallenge` would make the documented escape hatch unreachable at the
   * only endpoint that accepts it, and would skip `verifyChallenge`'s `challenge_failed` event
   * — so the per-challenge counter would advance while the account-scoped one never did,
   * leaving an account with a broken secret unthrottled no matter how long it was guessed at.
   *
   * Deliberately scoped to this one call site: `completeEnrolment`, and the disable/regenerate
   * paths to come, must keep the actionable error rather than silently report "invalid code".
   */
  const attemptTotp = async (userId: string, code: string) => {
    try {
      return await verifyTotpForUser(userId, code);
    } catch (error) {
      // None of these messages carry secret material, and this only fires on a genuinely broken
      // or absent secret, not on an ordinary wrong code — so it is a signal an operator needs
      // rather than something an attacker can use to flood the log.
      strapi.log.warn(
        `Two-factor verification could not check a TOTP code for admin user ${userId}. A recovery code is the way back into this account. Cause: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { valid: false as const };
    }
  };

  /**
   * Both enrolled factors are accepted at this one endpoint, TOTP first and then a recovery code.
   * There is deliberately no client-supplied factor selector: letting the caller pick which check
   * runs is the classic factor-switching bypass.
   */
  const verifyChallenge = async (token: string, code: string): Promise<VerifyChallengeResult> => {
    const challenge = await challengeQuery().findOne({ where: { token } });

    if (!challenge || challenge.consumedAt) {
      return { ok: false as const, reason: 'unusable' as const };
    }

    // Expiry must fail closed. `new Date('nonsense') <= new Date()` is false for an Invalid Date,
    // so comparing without this check would turn a missing or malformed `expiresAt` — a
    // hand-edited row, a column added by a migration that never backfilled — into a challenge
    // that never expires.
    const expiresAt = new Date(challenge.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return { ok: false as const, reason: 'unusable' as const };
    }

    if (await isAccountThrottled(challenge.userId)) {
      return { ok: false as const, reason: 'throttled' as const };
    }

    // One conditional statement — `UPDATE ... SET attempts = attempts + 1 WHERE id = ? AND
    // attempts < ?` — whose affected-row count is the decision, exactly like `consumeTotpStep`.
    // The cap check and the increment cannot be separated, so concurrent requests cannot all read
    // the same pre-write counter and each be granted an attempt. `increment(...).returning(...)`
    // would be the obvious way to judge the new value instead, but `returning` is unsupported on
    // MySQL, and reading the counter back would in any case be a second statement.
    //
    // This runs *before* any code is checked, so a request that crashes mid-verification has
    // still cost an attempt.
    const { tableName, attemptsColumn } = challengeTable();
    const accepted = await strapi.db
      .connection(tableName)
      .where({ id: challenge.id })
      .where(attemptsColumn, '<', config().maxChallengeAttempts)
      .increment(attemptsColumn, 1);

    if (accepted !== 1) {
      // The cap was already reached. Destroy the challenge rather than leave a dead row that some
      // later path might revive by resetting the counter: exhausting a challenge sends the user
      // back to their password, which is why the account-scoped tier below has to exist too.
      await challengeQuery().deleteMany({ where: { id: challenge.id } });
      return { ok: false as const, reason: 'exhausted' as const };
    }

    // Which check to even attempt is decided by the submitted code's own shape, never by anything
    // the client claims it is presenting. TOTP codes are 6-8 digits and recovery codes normalise
    // to exactly 10 characters, so the two factors have disjoint lengths and no input that could
    // have matched is excluded — this is a dispatch on the data, not the factor-switching bypass.
    //
    // It matters because `consumeRecoveryCode` bcrypt-compares against every unused code: without
    // this, every wrong 6-digit code on an unauthenticated endpoint would cost
    // `recoveryCodeCount` bcrypt comparisons, roughly a second of CPU each at the default of 10.
    // The attempt caps bound the total, but there is no reason to hand out the amplifier.
    const normalised = normaliseRecoveryCode(code);

    if (normalised.length <= MAX_TOTP_CODE_LENGTH) {
      const totpResult = await attemptTotp(challenge.userId, code);

      // `consumeTotpStep` is what makes a code single-use across the whole account rather than
      // within one challenge, so a code spent on an earlier challenge cannot be replayed against a
      // freshly created one (CVE-2024-0227).
      if (totpResult.valid && (await consumeTotpStep(challenge.userId, totpResult.step))) {
        return consumeChallenge(challenge.id, challenge.userId);
      }
    }

    if (
      normalised.length === RECOVERY_CODE_LENGTH &&
      (await consumeRecoveryCode(challenge.userId, code))
    ) {
      // Recorded on consumption rather than on success: the code is spent either way, and the
      // notice is about a recovery code having been used on the account.
      await recordEvent(challenge.userId, 'recovery_code_used');
      return consumeChallenge(challenge.id, challenge.userId);
    }

    // Reached whether a check ran and failed or the code matched no factor's shape at all. Both
    // are one spent attempt at both tiers: the per-challenge counter above and this event, which
    // is what `isAccountThrottled` counts. A path that charges one tier but not the other is a
    // hole in the other.
    await recordEvent(challenge.userId, 'challenge_failed');
    return { ok: false as const, reason: 'invalid' as const };
  };

  /**
   * Housekeeping, not enforcement: expired challenges are already rejected on read, so this only
   * keeps the table from growing. Nothing depends on it having run.
   *
   * The DELETE is unbounded — no LIMIT, no batching. That is acceptable rather than overlooked:
   * rows can only be created by `createChallenge`, which is throttled per account and rate
   * limited per IP, and `challengeTtl` defaults to five minutes, so the expired set at boot is
   * small. If that ever stops being true the fix is batching here, not a shorter TTL.
   */
  const sweepExpiredChallenges = async (): Promise<number> => {
    const result = await challengeQuery().deleteMany({
      where: { expiresAt: { $lt: new Date() } },
    });

    return result?.count ?? 0;
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
    recordEvent,
    isAccountThrottled,
    createChallenge,
    verifyChallenge,
    sweepExpiredChallenges,
  };
};

export default createMfaService;
