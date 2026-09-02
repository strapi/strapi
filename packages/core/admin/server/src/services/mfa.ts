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
import type { Core, Data } from '@strapi/types';
import { MFA_DEFAULTS, validateMfaConfig, type MfaConfig } from '../config/mfa';
import mfaChangedTemplate from '../config/email-templates/mfa-changed';
import type { MfaEventNotice } from '../../../shared/contracts/mfa';

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
 * The per-user cap `pruneEvents` enforces on `admin::mfa-event` rows. Comfortably above anything
 * `maxUserAttempts`/`userAttemptWindow` could produce on their own (10 failures per 900s by
 * default), so the exemptions in `pruneEvents` are the actual guarantee for `isAccountThrottled`
 * -- this cap only keeps the table bounded for an account that keeps generating other kinds of
 * event (enable/disable/reset/recovery-code-use) indefinitely.
 */
export const MAX_EVENTS_PER_USER = 500;

/**
 * Security notices surfaced in-app, and — for `challenge_failed` — the stored counter the
 * account-scoped throttle reads. Never carries the code, secret or URI it is about.
 *
 * `recovery_codes_issued` is the odd one out: it is an acknowledgement marker, not a notice.
 * Every call to `issueRecoveryCodes` (enrolment and regenerate alike) records a fresh one, and
 * `areCodesAcknowledged` reads only the newest row of this type — see `issueRecoveryCodes`,
 * `areCodesAcknowledged` and `acknowledgeCodes` below. It is deliberately excluded from
 * `unseenEvents`/`markEventsSeen`, which surface and clear notices, not this marker.
 */
export type MfaEventType =
  | 'enabled'
  | 'disabled'
  | 'reset'
  | 'challenge_failed'
  | 'recovery_code_used'
  | 'recovery_codes_issued';

/**
 * The only shape `recordEvent`'s `metadata` may carry, enforced at the type level rather than by
 * convention -- a compile error is a much stronger guarantee than a comment nobody happens to
 * violate yet. `userAgent`/`ip` are neutral request context; `via: 'cli'` is how the CLI reset
 * (Task 12) marks an event it recorded outside any HTTP request. None of the three can ever be a
 * code, a secret or an otpauth URI.
 */
export type MfaEventMetadata = {
  userAgent?: string;
  ip?: string;
  via?: 'cli';
};

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
 *  - Self-service management (Task 10): `unseenEvents`, `markEventsSeen`, `areCodesAcknowledged`,
 *    `acknowledgeCodes` — the in-app notice feed and recovery-code acknowledgement — plus
 *    `assertPasswordAndFactor` and `disable`, the shared re-authentication gate and its one
 *    consumer that turns two-factor authentication off.
 *  - Outbound notices (Task 11): `notify` — the eventHub event and best-effort change email
 *    layered on top of `recordEvent` — and `pruneEvents`, the per-user retention cap on
 *    `admin::mfa-event` that `recordEvent` runs after every insert.
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
    // so the delete, the insert and the acknowledgement marker below either all land or none does
    // — a `createMany` failure (constraint violation, dropped connection) must never strand the
    // delete having already committed, which would leave the account with zero recovery codes and
    // no way to get any.
    await strapi.db.transaction(async () => {
      await recoveryQuery().deleteMany({ where: { userId: String(userId) } });

      // `recoveryCodeCount: 0` is a valid, if unusual, config (disables the fallback entirely).
      // `createMany({ data: [] })` against an empty array is not a case worth trusting every
      // query engine to no-op correctly, so skip it outright rather than assume.
      if (data.length > 0) {
        await recoveryQuery().createMany({ data });
      }

      // A fresh, unacknowledged marker every time codes are (re)issued -- enrolment
      // (`completeEnrolment`) and regenerate both go through here, so `areCodesAcknowledged`
      // always reflects the newest set, never a stale acknowledgement of codes the caller
      // already replaced. Inside the same transaction as the codes themselves: a marker for a
      // set that never landed (or codes with no marker to eventually acknowledge) are both wrong.
      await recordEvent(userId, 'recovery_codes_issued');
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
    metadata: MfaEventMetadata = {}
  ): Promise<void> => {
    await eventQuery().create({ data: { userId: String(userId), type, metadata, seenAt: null } });
    await pruneEvents(userId);
  };

  /**
   * The four notice types `notify` may announce -- deliberately narrower than `MfaEventType`.
   * `recovery_code_used` and `recovery_codes_issued` never reach here: both are already fully
   * served by `recordEvent` alone (the in-app notice feed, and the acknowledgement marker
   * respectively), and an emailed notice on every recovery-code use would mean an attacker who has
   * already stolen one credential now also learns, by email, that the account holder is about to
   * find out. Keeping this union out of `notify`'s own signature, rather than reusing
   * `MfaEventType` and rejecting the other two at runtime, turns passing either of them into a
   * compile error.
   */
  type MfaChangeNotice = 'enabled' | 'disabled' | 'reset' | 'challenge_failed';

  /**
   * Fire and forget. Strapi's own forgotPassword does exactly this: send, catch, log server side,
   * let the operation succeed. Many self-hosted instances never configure a provider, so email
   * cannot be a hard dependency of a security control. The primary channel is the in-app notice
   * built from unseen mfa events.
   *
   * The eventHub event fires for all four notice types -- `admin.mfa.<type>`, `_` replaced by `.`
   * so `challenge_failed` becomes `admin.mfa.challenge.failed` -- unconditionally, since it is
   * cheap and synchronous and EE audit logs depend on it for every one of the four. The email is
   * sent only for an actual change (`enabled`/`disabled`/`reset`): a failed challenge is a notice,
   * not a change, and mailing every wrong code would let anyone who merely knows the password
   * flood the account holder's inbox.
   */
  const notify = (userId: string, type: MfaChangeNotice): void => {
    strapi.eventHub.emit(`admin.mfa.${type.replace(/_/g, '.')}`, { userId });

    if (type === 'challenge_failed') {
      return;
    }

    (async () => {
      try {
        const user = await userQuery().findOne({ where: { id: userId } });
        if (!user?.email) return;

        await strapi
          .plugin('email')
          .service('email')
          .sendTemplatedEmail(
            {
              to: user.email,
              from: strapi.config.get('admin.forgotPassword.from'),
              replyTo: strapi.config.get('admin.forgotPassword.replyTo'),
            },
            strapi.config.get('admin.auth.mfa.emailTemplate', mfaChangedTemplate),
            {
              user: { email: user.email, firstname: user.firstname },
              change: type,
              changedAt: new Date().toISOString(),
            }
          );
      } catch (error) {
        strapi.log.error('Failed to send the two-factor change notification', error);
      }
    })();
  };

  /**
   * Caps how many `admin::mfa-event` rows a single account can accumulate, run after every insert
   * so the table cannot grow without bound. Two kinds of row are exempt no matter how old they
   * are:
   *  - `recovery_codes_issued`, the acknowledgement marker `areCodesAcknowledged` reads
   *    indefinitely (see `MfaEventType` above) -- pruning it out from under a still-unacknowledged
   *    set would make "have I saved my codes?" unanswerable.
   *  - a `challenge_failed` row younger than `config().userAttemptWindow` seconds -- exactly the
   *    rows `isAccountThrottled`'s rolling window counts. Removing one of those early would let an
   *    attacker outlast the account-scoped throttle by generating enough other traffic (failed
   *    challenges included) to push it past the cap before the window naturally clears it.
   *
   * The cutoff -- the `createdAt` of the `MAX_EVENTS_PER_USER`th-newest row -- is found with a
   * plain, ordered read; the actual deletion is the one `deleteMany` below, whose `where` encodes
   * both exemptions directly rather than filtering candidates in application code.
   */
  const pruneEvents = async (userId: string): Promise<void> => {
    const total = await eventQuery().count({ where: { userId: String(userId) } });
    if (total <= MAX_EVENTS_PER_USER) {
      return;
    }

    // `findOne` is typed without `offset` (it is meant for a unique-ish lookup, not the Nth row of
    // an ordered set), so the cutoff read goes through `findMany` with `limit: 1` instead --
    // exactly the `ORDER BY createdAt DESC, id DESC OFFSET n LIMIT 1` this needs, fully typed.
    const [cutoff] = await eventQuery().findMany({
      where: { userId: String(userId) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      offset: MAX_EVENTS_PER_USER - 1,
      limit: 1,
    });

    if (!cutoff) {
      return;
    }

    const { userAttemptWindow } = config();
    const attemptWindowStart = new Date(Date.now() - userAttemptWindow * 1000);

    await eventQuery().deleteMany({
      where: {
        userId: String(userId),
        createdAt: { $lt: new Date(cutoff.createdAt) },
        type: { $ne: 'recovery_codes_issued' },
        $or: [{ type: { $ne: 'challenge_failed' } }, { createdAt: { $lte: attemptWindowStart } }],
      },
    });
  };

  /**
   * A `where` fragment excluding the `recovery_codes_issued` acknowledgement marker: it is not a
   * security notice, so it must never surface from `unseenEvents` or be touched by
   * `markEventsSeen` -- including when a caller passes the marker's own id in `ids`. Only
   * `acknowledgeCodes` (and, transitively, `/mfa/recovery-codes/ack`) may ever clear it.
   */
  const NOT_ACKNOWLEDGEMENT_MARKER = { $ne: 'recovery_codes_issued' as const };

  /**
   * Notices surfaced in-app (GET /mfa/notices): the caller's own events not yet marked seen.
   * Ordering is left to whatever the store returns -- this is drained by an authenticated
   * self-service endpoint, not a paginated feed. Mapped to the public shape rather than returned
   * as raw rows: `userId` is redundant (it is always the caller's own) and dates are serialised
   * to ISO strings, matching `MfaEventNotice`.
   */
  const unseenEvents = async (userId: string): Promise<MfaEventNotice[]> => {
    const rows = await eventQuery().findMany({
      where: { userId: String(userId), seenAt: null, type: NOT_ACKNOWLEDGEMENT_MARKER },
    });

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      metadata: row.metadata ?? {},
      createdAt: new Date(row.createdAt).toISOString(),
      seenAt: row.seenAt ? new Date(row.seenAt).toISOString() : null,
    }));
  };

  /**
   * Marks the caller's own notice rows seen. `userId` is always part of the `where`, and `ids`
   * -- when given -- only narrows it further, so a foreign id slipped into `ids` can never reach
   * another user's row. An absent `ids` marks every one of the caller's notices.
   *
   * The `recovery_codes_issued` marker is excluded unconditionally, even when its own id is
   * included in `ids`: it is an acknowledgement marker, not a notice, and only
   * `POST /mfa/recovery-codes/ack` may clear it -- otherwise dismissing the notice feed would be
   * indistinguishable from confirming the recovery codes were saved.
   */
  const markEventsSeen = async (userId: string, ids?: Data.ID[]): Promise<void> => {
    const where: Record<string, unknown> = {
      userId: String(userId),
      type: NOT_ACKNOWLEDGEMENT_MARKER,
    };
    if (ids) {
      where.id = { $in: ids };
    }

    await eventQuery().updateMany({ where, data: { seenAt: new Date() } });
  };

  /**
   * Whether the *current* recovery-code set has been acknowledged. Reads only the newest
   * `recovery_codes_issued` marker (each call to `issueRecoveryCodes` -- enrolment and regenerate
   * alike -- records a fresh one): an older, already-acknowledged marker must never make a
   * just-regenerated set read as acknowledged. Ordered by `createdAt` then `id`, both descending:
   * two markers can share a millisecond-resolution timestamp, and `id` is the only thing that
   * still orders them correctly when they do. No row at all (a pre-Task-10 account, or one that
   * has never had codes issued) means "not acknowledged", not an error.
   */
  const areCodesAcknowledged = async (userId: string): Promise<boolean> => {
    const latest = await eventQuery().findOne({
      where: { userId: String(userId), type: 'recovery_codes_issued' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return Boolean(latest?.seenAt);
  };

  /**
   * One conditional UPDATE, not read-then-write: `seenAt: null` is part of the `where` itself, so
   * there is nothing to decide first. Scoped to `type: 'recovery_codes_issued'` only -- this must
   * never touch an ordinary notice, which is exactly what `markEventsSeen` is for.
   */
  const acknowledgeCodes = async (userId: string): Promise<void> => {
    await eventQuery().updateMany({
      where: { userId: String(userId), type: 'recovery_codes_issued', seenAt: null },
      data: { seenAt: new Date() },
    });
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
    notify(challenge.userId, 'challenge_failed');
    return { ok: false as const, reason: 'invalid' as const };
  };

  /**
   * The shared re-authentication gate for the self-service operations that need more than an
   * active session: disabling two-factor authentication and regenerating recovery codes. Both are
   * exactly the "attacker holds a session" scenario, so both demand the password again, plus a
   * still-working second factor -- either a TOTP code or a recovery code, dispatched by the
   * submitted code's own shape, for the same reason `verifyChallenge` does: letting the caller
   * declare which factor they are presenting is the classic factor-switching bypass.
   *
   * Calls `verifyTotpForUser` directly rather than `attemptTotp`: `attemptTotp`'s error-swallowing
   * is deliberately scoped to the unauthenticated challenge path, and here the actionable "secret
   * could not be read" error must keep propagating rather than collapse into "Invalid code". A
   * recovery-shaped code never reaches the TOTP branch at all (the shape dispatch below), so an
   * account whose secret cannot be decrypted can still be disabled with a recovery code -- Task 5
   * noted that `mfaEnabledAt` set with `mfaSecret` null is otherwise un-enrollable except via the
   * CLI.
   */
  const assertPasswordAndFactor = async (
    userId: string,
    password: string,
    code: string
  ): Promise<void> => {
    const user = await loadUser(userId);

    // Wrong password is not a second-factor attempt: it charges neither throttle tier.
    if (!(await auth.validatePassword(password, user.password))) {
      throw new ValidationError('Invalid credentials');
    }

    if (await isAccountThrottled(userId)) {
      throw new RateLimitError();
    }

    const normalised = normaliseRecoveryCode(code);

    if (normalised.length <= MAX_TOTP_CODE_LENGTH) {
      const totpResult = await verifyTotpForUser(userId, code);
      if (totpResult.valid && (await consumeTotpStep(userId, totpResult.step))) {
        return;
      }
    }

    if (normalised.length === RECOVERY_CODE_LENGTH && (await consumeRecoveryCode(userId, code))) {
      // Recorded on consumption, same as `verifyChallenge`: the code is spent either way, and the
      // notice is about a recovery code having been used on the account.
      await recordEvent(userId, 'recovery_code_used');
      return;
    }

    // Reached whether a check ran and failed or the code matched no factor's shape at all -- one
    // spent attempt at the account-scoped tier, mirroring `verifyChallenge`.
    await recordEvent(userId, 'challenge_failed');
    notify(userId, 'challenge_failed');
    throw new ValidationError('Invalid code');
  };

  /**
   * Clears enrolment entirely. Recovery codes and outstanding challenges go too, so a later
   * re-enrolment starts clean rather than inheriting stale rows.
   *
   * Wrapped in a transaction, same reasoning as `issueRecoveryCodes`: these three statements must
   * all land or none does. Without it, a failure on the user `update` (the last of the three)
   * would leave `mfaEnabledAt`/`mfaSecret` still set -- so a code is still demanded on every
   * future request -- with the recovery codes already deleted, and `beginEnrolment` refuses to
   * re-enrol while `mfaEnabledAt` is set. That is a permanent lockout with no way back in short of
   * the CLI reset.
   */
  const disable = async (userId: string): Promise<void> => {
    await strapi.db.transaction(async () => {
      await recoveryQuery().deleteMany({ where: { userId: String(userId) } });
      await challengeQuery().deleteMany({ where: { userId: String(userId) } });
      await userQuery().update({
        where: { id: userId },
        data: { mfaSecret: null, mfaEnabledAt: null, mfaLastUsedStep: null },
      });
    });
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
    notify,
    pruneEvents,
    unseenEvents,
    markEventsSeen,
    areCodesAcknowledged,
    acknowledgeCodes,
    isAccountThrottled,
    createChallenge,
    verifyChallenge,
    assertPasswordAndFactor,
    disable,
    sweepExpiredChallenges,
  };
};

export default createMfaService;
