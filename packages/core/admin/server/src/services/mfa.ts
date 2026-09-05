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
import { readMfaEnforcement } from './security-settings';
import type { MfaEnforcement } from '../../../shared/contracts/security-settings';

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
  | 'recovery_codes_issued'
  | 'grace_started'
  | 'locked'
  | 'unlocked'
  | 'authenticator_replaced';

/**
 * The shape `recordEvent`'s `metadata` is expected to carry -- what `buildSessionMetadataFromContext`
 * actually returns (`loginAt`, and `deviceName` when the user-agent maps to one; see
 * `@strapi/utils`'s `buildSessionMetadata`), plus `via: 'cli'`, how the CLI reset (Task 12) marks
 * an event it recorded outside any HTTP request. None of these can ever be a code, a secret or an
 * otpauth URI.
 *
 * This only turns an undeclared field into a compile error for an object literal passed directly
 * to `recordEvent` -- every field below is optional, so a `Record<string, unknown>` value (exactly
 * what `buildSessionMetadataFromContext` returns) is still assignable here with no
 * excess-property check. The guarantee is "nothing declared here can be a secret", not "nothing
 * but these three keys can ever reach the database".
 */
export type MfaEventMetadata = {
  loginAt?: string;
  deviceName?: string;
  via?: 'cli';
  /** ISO deadline carried by `grace_started` and `locked`. Never a secret. */
  graceUntil?: string;
  /** The administrator who unlocked the account (`unlocked` only). */
  byUserId?: string;
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

/**
 * The result of `enforce`, cycle 2's session-issue evaluation. `none` covers every case where
 * nothing further is required of the caller (feature or mode off, not required, already
 * enrolled). `grace` still issues the session, carrying the deadline for the admin panel to
 * display. `refused` means the caller must not receive a session: the account is locked, or the
 * row backing it no longer exists.
 */
export type EnforceOutcome =
  | { outcome: 'none' }
  | { outcome: 'grace'; graceUntil: Date }
  | { outcome: 'refused' };

/**
 * The raw `admin::user` row shape every enforcement function works on. Roles are optional
 * because `checkCredentials` (the login path) does not populate them; the resolver loads them
 * when they are absent rather than silently treating "not populated" as "no roles".
 */
export type AdminUserRow = {
  id: Data.ID;
  password?: string | null;
  roles?: Array<{ id: Data.ID; mfaRequired?: boolean | null }> | null;
  mfaSecret?: string | null;
  mfaEnabledAt?: string | Date | null;
  mfaGraceUntil?: string | Date | null;
  mfaLockedAt?: string | Date | null;
};

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
   * Memoises onto the row: `isMfaRequiredFor` can need roles twice in the same call -- once for
   * the SSO-locked check in `isExemptFromMfa`, again for the `optional`-mode scan -- and both
   * must see the same answer without querying the database twice.
   */
  const loadRoles = async (
    user: AdminUserRow
  ): Promise<Array<{ id: Data.ID; mfaRequired?: boolean | null }>> => {
    if (Array.isArray(user.roles)) {
      return user.roles;
    }
    const loaded = await userQuery().load(user, 'roles', { select: ['id', 'mfaRequired'] });
    const roles = Array.isArray(loaded) ? loaded : [];
    user.roles = roles;
    return roles;
  };

  /**
   * Resolver step 0. An account with no local password can only ever log in through EE SSO, and
   * an SSO-locked account is refused by the local strategy outright, so neither can be graced or
   * locked on any path -- including `/access-token`, where SSO-minted sessions do arrive. This
   * single rule is what keeps the guard exemption, the SSO carve-out and the refresh path
   * consistent. Mirrors `ee/server/src/utils/sso-lock.ts` (CE code cannot import from `ee/`),
   * including its comparison -- `lockedId === String(role.id)` leaves `lockedId` uncoerced, so a
   * numeric `ssoLockedRoles` entry that EE's own strict-equality check would fail to match also
   * fails to match here. This exemption must never be broader than the local-login block SSO
   * locking actually enforces: coercing both sides would exempt a password-holding user from MFA
   * that EE never actually locked out of local login.
   */
  const isExemptFromMfa = async (user: AdminUserRow): Promise<boolean> => {
    if (!user.password) {
      return true;
    }

    if (!strapi.ee.features.isEnabled('sso')) {
      return false;
    }

    const adminStore = strapi.store({ type: 'core', name: 'admin' });
    const auth = (await adminStore.get({ key: 'auth' })) as
      | { providers?: { ssoLockedRoles?: Array<string | number> } }
      | null
      | undefined;
    const lockedRoles = auth?.providers?.ssoLockedRoles ?? [];
    if (lockedRoles.length === 0) {
      return false;
    }

    const roles = await loadRoles(user);
    return lockedRoles.some((lockedId) => roles.some((role) => lockedId === String(role.id)));
  };

  /**
   * The only place enforcement policy is read. Order is cheapest-first; the result is the same in
   * any order: the feature must be on, the user must be subject to local login at all, then the
   * mode decides, and only `optional` needs the roles.
   */
  const isMfaRequiredFor = async (
    user: AdminUserRow,
    enforcement?: MfaEnforcement
  ): Promise<boolean> => {
    if (!isEnabled()) {
      return false;
    }

    if (await isExemptFromMfa(user)) {
      return false;
    }

    const { mode } = enforcement ?? (await readMfaEnforcement(strapi));
    if (mode === 'off') {
      return false;
    }
    if (mode === 'required') {
      return true;
    }

    const roles = await loadRoles(user);
    return roles.some((role) => role.mfaRequired === true);
  };

  const DAY_MS = 24 * 60 * 60 * 1000;

  const isEnrolledRow = (user: AdminUserRow): boolean =>
    Boolean(user.mfaEnabledAt && user.mfaSecret);

  /**
   * One conditional UPDATE each; the affected count is the decision (cycle 1's atomicity rule).
   * Read-then-write would let a refresh-path lock race an administrator's unlock and silently win.
   */
  const stampGrace = async (userId: string, graceUntil: Date): Promise<boolean> => {
    const { count } = await userQuery().updateMany({
      where: { id: userId, mfaGraceUntil: null, mfaLockedAt: null },
      data: { mfaGraceUntil: graceUntil },
    });
    return count === 1;
  };

  /**
   * `precondition` is the caller's own read of `mfaGraceUntil`, expressed as a `where` fragment:
   * `{ mfaGraceUntil: { $lte: now } }` for the ordinary case, or an exact match on the raw stored
   * value (`{ mfaGraceUntil: row.mfaGraceUntil }`) when that value didn't parse as a date at all.
   * A malformed column (hand-edited, or a weakly-typed engine like SQLite letting a non-date
   * string into a datetime column) has no portable ordering against `now` -- what a `$lte`
   * comparison even does with it is engine-specific -- but it can always be compared for exact
   * equality, which still gives the precondition its race protection: if anything rewrote the
   * column between the read and this statement (a fresh grace, a clear, another lock), the value
   * has changed and the match -- and the lock -- fails.
   */
  const lockAccount = async (
    userId: string,
    now: Date,
    precondition: Record<string, unknown>
  ): Promise<boolean> => {
    const { count } = await userQuery().updateMany({
      where: { id: userId, mfaLockedAt: null, ...precondition },
      data: { mfaLockedAt: now },
    });
    return count === 1;
  };

  const clearEnforcementStamps = async (userId: string): Promise<void> => {
    await userQuery().updateMany({
      where: { id: userId },
      data: { mfaGraceUntil: null, mfaLockedAt: null },
    });
  };

  const invalidateAllSessions = async (userId: string): Promise<void> => {
    if (strapi.sessionManager?.hasOrigin('admin')) {
      await strapi.sessionManager('admin').invalidateRefreshToken(userId);
      return;
    }
    // The lock and its event still land either way (see the caller): this only means a session
    // minted before the admin origin was registered survives the lock silently unless someone
    // reads the logs. User id only, never anything session- or token-shaped.
    strapi.log.warn(
      `Admin session origin is not registered; sessions for admin user ${userId} were not invalidated on lock.`
    );
  };

  /**
   * Cycle 2 enforcement, run by every path that mints a session for a password-holding user.
   * Reloads the row with roles itself so callers may pass a partial user. See the outcome table in
   * the cycle 2 spec ("Enforcement evaluation"); `retried` bounds the single re-read taken when a
   * conditional update finds its precondition gone.
   */
  const enforce = async (user: { id: Data.ID }, retried = false): Promise<EnforceOutcome> => {
    if (!isEnabled()) {
      return { outcome: 'none' };
    }

    const row = (await userQuery().findOne({
      where: { id: user.id },
      populate: ['roles'],
    })) as AdminUserRow | null;
    if (!row) {
      return { outcome: 'refused' };
    }
    const userId = String(row.id);

    const enforcement = await readMfaEnforcement(strapi);
    if (enforcement.mode === 'off') {
      return { outcome: 'none' };
    }

    if (!(await isMfaRequiredFor(row, enforcement))) {
      if (row.mfaGraceUntil || row.mfaLockedAt) {
        await clearEnforcementStamps(userId);
      }
      return { outcome: 'none' };
    }

    if (isEnrolledRow(row)) {
      return { outcome: 'none' };
    }

    if (row.mfaLockedAt) {
      return { outcome: 'refused' };
    }

    const now = new Date();

    if (!row.mfaGraceUntil) {
      const graceUntil = new Date(now.getTime() + enforcement.graceDays * DAY_MS);
      if (await stampGrace(userId, graceUntil)) {
        await recordEvent(userId, 'grace_started', { graceUntil: graceUntil.toISOString() });
        return { outcome: 'grace', graceUntil };
      }
      // Lost a race with another first session (or an unlock). The row now says what to do.
      return retried ? { outcome: 'refused' } : enforce(user, true);
    }

    const graceUntil = new Date(row.mfaGraceUntil);
    const malformed = Number.isNaN(graceUntil.getTime());
    if (malformed) {
      // A malformed stamp must fail closed on the lock side, never become a grace that never ends.
      strapi.log.warn(
        `Malformed mfaGraceUntil on admin user ${userId}; treating the grace as expired.`
      );
    } else if (graceUntil > now) {
      return { outcome: 'grace', graceUntil };
    }

    // The ordinary precondition orders the stored deadline against `now`; a malformed value has no
    // portable ordering (see `lockAccount`'s doc comment), so its own precondition is an exact
    // match on the raw value just read instead.
    const lockPrecondition = malformed
      ? { mfaGraceUntil: row.mfaGraceUntil }
      : { mfaGraceUntil: { $lte: now } };

    if (await lockAccount(userId, now, lockPrecondition)) {
      // Sessions first: a failing event write must never leave a live session past the lock.
      await invalidateAllSessions(userId);
      await recordEvent(userId, 'locked', {
        graceUntil: malformed ? undefined : graceUntil.toISOString(),
      });
      notify(userId, 'locked');
      return { outcome: 'refused' };
    }

    // Precondition gone: an unlock landed between the read and the lock. Re-read once.
    return retried ? { outcome: 'refused' } : enforce(user, true);
  };

  /**
   * Administrator unlock. One conditional UPDATE (`mfaLockedAt IS NOT NULL` is the precondition);
   * zero rows means "not locked", which the endpoint reports as 400. No grace is stamped here: the
   * user's next session starts a fresh window, so an unlock while they are on leave cannot re-lock
   * them unseen.
   */
  const unlock = async (
    userId: string,
    actor: { byUserId?: string; via?: 'cli' }
  ): Promise<boolean> => {
    const { count } = await userQuery().updateMany({
      where: { id: userId, mfaLockedAt: { $notNull: true } },
      data: { mfaLockedAt: null, mfaGraceUntil: null },
    });
    if (count !== 1) {
      return false;
    }

    await recordEvent(userId, 'unlocked', {
      ...(actor.byUserId ? { byUserId: actor.byUserId } : {}),
      ...(actor.via ? { via: actor.via } : {}),
    });
    notify(userId, 'unlocked', actor.byUserId ? { byUserId: actor.byUserId } : {});
    return true;
  };

  /**
   * Decrypts the stored secret, turning any way it can go wrong — a missing/rotated key, a
   * corrupted or hand-edited value, an unsupported version tag — into the same actionable
   * per-user error. `encryption.decrypt` throws raw `Error`s for malformed input instead of
   * returning null for every failure mode, and `base32Decode` throws on non-base32 plaintext, so
   * both must be inside the same guard or a malformed stored value becomes an unhandled 500.
   */
  const readSecret = (ciphertext: string | null | undefined): Buffer => {
    if (!ciphertext) {
      throw new ValidationError('Two-factor authentication is not set up for this account');
    }

    let secret: Buffer | null = null;
    try {
      const decrypted = encryption.decrypt(ciphertext);
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

  const beginEnrolment = async (userId: string, password: string, code?: string) => {
    const user = await loadUser(userId);

    const passwordOk = await auth.validatePassword(password, user.password);
    if (!passwordOk) {
      throw new ValidationError('Invalid credentials');
    }

    // An enrolled account may replace its authenticator, but only by proving it still holds the
    // current second factor: a TOTP code from the existing app or an unused recovery code. The
    // password alone is exactly the credential 2FA exists to back up, so it cannot authorise
    // swapping the factor. The active secret is untouched until `completeEnrolment` promotes
    // the pending one, so an abandoned replacement changes nothing.
    if (user.mfaEnabledAt && user.mfaSecret) {
      if (!code) {
        throw new ValidationError(
          'A current two-factor code or a recovery code is required to replace your authenticator'
        );
      }
      // `assertFactor` is defined with the re-authentication gate below.
      await assertFactor(userId, code);
    }

    const secret = generateTotpSecret();
    const encoded = base32Encode(secret);
    const encrypted = encryption.encrypt(encoded);

    if (!encrypted) {
      throw new ApplicationError(
        'Cannot enable two-factor authentication because the admin encryption key is not configured. Set ENCRYPTION_KEY and restart.'
      );
    }

    // Pending, never active: an issued-but-unverified secret is not an enrolment. The next
    // attempt simply overwrites it, so an abandoned flow needs no cleanup, and a fresh account's
    // `mfaSecret` / `mfaEnabledAt` stay null until verification.
    await userQuery().update({
      where: { id: userId },
      data: { mfaPendingSecret: encrypted },
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
    const secret = readSecret(user.mfaSecret);
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
    const user = await loadUser(userId);
    if (!user.mfaPendingSecret) {
      throw new ValidationError('No enrolment in progress');
    }

    const pending = readSecret(user.mfaPendingSecret);
    const { digits, step, window } = config();
    const result = verifyTotp({
      secret: pending,
      code: code.replace(/\s+/g, ''),
      digits,
      step,
      window,
    });
    if (!result.valid) {
      throw new ValidationError('Invalid code');
    }

    // Steps are wall-clock indices shared by the active and the pending secret, so the account's
    // single replay guard covers both: a code accepted here can never be replayed at login, and a
    // replacement does not reset `mfaLastUsedStep` (resetting it would reopen exactly that).
    const consumed = await consumeTotpStep(userId, result.step);
    if (!consumed) {
      throw new ValidationError('Invalid code');
    }

    const replaced = Boolean(user.mfaEnabledAt && user.mfaSecret);

    // Issued before the promotion, not after: if this throws, the safe direction is to leave the
    // pending secret pending (a fresh account stays unenrolled and free to retry; a replacing
    // account keeps its working authenticator) rather than promote with no recovery codes.
    const recoveryCodes = await issueRecoveryCodes(userId);

    // A single conditional statement, not read-then-write: `mfaPendingSecret` is part of the
    // `where` itself, so the promotion only applies to the exact row this call read at the top.
    // Without that, a `disable` (or anything else) racing in between the read above and this
    // write would be silently undone -- the account would come back enrolled on the abandoned
    // pending secret the moment this write lands, no matter what ran in between.
    const { count } = await userQuery().updateMany({
      where: { id: userId, mfaPendingSecret: user.mfaPendingSecret },
      data: {
        mfaSecret: user.mfaPendingSecret,
        mfaPendingSecret: null,
        mfaEnabledAt: replaced ? user.mfaEnabledAt : new Date(),
        // Enrolling satisfies any enforcement requirement, so both stamps are cleared. The lock
        // cannot be set on an account holding a session, this is purely defensive.
        mfaGraceUntil: null,
        mfaLockedAt: null,
      },
    });

    if (count !== 1) {
      throw new ValidationError('No enrolment in progress');
    }

    return { recoveryCodes, replaced };
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

    // Retention housekeeping must never fail the security operation that triggered it -- the same
    // principle `notify`'s email applies. `issueRecoveryCodes` calls `recordEvent` for its
    // `recovery_codes_issued` marker from inside `strapi.db.transaction`, so an uncaught failure
    // here (the `count`, the cutoff read, or the `deleteMany`) would roll back the recovery codes
    // just written and fail enrolment or a regenerate over nothing but a pruning error. Kept
    // awaited rather than detached: a fire-and-forget promise started inside an ambient
    // transaction context would either escape it unexpectedly or dangle past it, neither of which
    // beats simply catching the failure here.
    try {
      await pruneEvents(userId);
    } catch (error) {
      strapi.log.error('Failed to prune admin::mfa-event rows', error);
    }
  };

  /**
   * The notice types `notify` may announce -- deliberately narrower than `MfaEventType`.
   * `recovery_code_used` and `recovery_codes_issued` never reach here: both are already fully
   * served by `recordEvent` alone (the in-app notice feed, and the acknowledgement marker
   * respectively), and an emailed notice on every recovery-code use would mean an attacker who has
   * already stolen one credential now also learns, by email, that the account holder is about to
   * find out. `locked` and `unlocked` are cycle 2's own additions -- see `EmailedNotice` below for
   * why neither ever reaches an inbox. Keeping this union out of `notify`'s own signature, rather
   * than reusing `MfaEventType` and rejecting the excluded members at runtime, turns passing one of
   * them into a compile error.
   */
  type MfaChangeNotice =
    | 'enabled'
    | 'disabled'
    | 'reset'
    | 'challenge_failed'
    | 'authenticator_replaced'
    | 'locked'
    | 'unlocked';

  /**
   * The subset of `MfaChangeNotice` that also sends a change email -- a change to the user's own
   * second factor. `challenge_failed` is a notice, not a change; `locked`/`unlocked` are cycle 2's
   * own decision to keep enforcement hub-only (the in-app notice feed carries them instead). Kept
   * as its own type, rather than an `Exclude<MfaChangeNotice, ...>` of the ever-growing exclusion
   * list, so `CHANGE_NOTICE_TEXT` below stays exhaustive over exactly the emailed members and a
   * newly added hub-only notice cannot silently start demanding an email phrase.
   */
  type EmailedNotice = 'enabled' | 'disabled' | 'reset' | 'authenticator_replaced';

  const EMAILED_NOTICES: ReadonlySet<MfaChangeNotice> = new Set<EmailedNotice>([
    'enabled',
    'disabled',
    'reset',
    'authenticator_replaced',
  ]);

  const isEmailedNotice = (type: MfaChangeNotice): type is EmailedNotice =>
    EMAILED_NOTICES.has(type);

  /**
   * The `<%= change %>` phrase fed to `mfaChangedTemplate` ("Two-factor authentication was
   * <%= change %> on your account..."). `enabled`, `disabled` and `reset` map to themselves, so
   * those three emails read exactly as they did before `authenticator_replaced` existed;
   * `authenticator_replaced` gets its own phrase rather than leaking the raw enum value verbatim
   * into the sentence. Typed over exactly `EmailedNotice`, not `MfaChangeNotice`, so the typecheck
   * itself keeps this exhaustive -- `challenge_failed`, `locked` and `unlocked` never reach this
   * map, `notify` returns before composing an email for any of them.
   */
  const CHANGE_NOTICE_TEXT: Record<EmailedNotice, string> = {
    enabled: 'enabled',
    disabled: 'disabled',
    reset: 'reset',
    authenticator_replaced: 'moved to a new authenticator app',
  };

  /**
   * Fire and forget by default -- Strapi's own forgotPassword does exactly this: send, catch, log
   * server side, let the operation succeed. Many self-hosted instances never configure a
   * provider, so email cannot be a hard dependency of a security control. The primary channel is
   * the in-app notice built from unseen mfa events.
   *
   * The eventHub event fires for every notice type -- `admin.mfa.<type>`, `_` replaced by `.` so
   * `challenge_failed` becomes `admin.mfa.challenge.failed` -- unconditionally, since it is cheap
   * and synchronous and is the one mechanism EE audit logging (where licensed) can observe any of
   * them through; whether a given emission ends up as a persisted audit row is entirely that
   * feature's own decision (its allow-list, licensing, request context), not this function's. The
   * email is sent only for an actual change to the user's own factor (`EmailedNotice`): a failed
   * challenge is a notice, not a change, and mailing every wrong code would let anyone who merely
   * knows the password flood the account holder's inbox. `locked`/`unlocked` are hub-only by the
   * same reasoning, and by cycle 2's own decision to send no lock emails at all -- the in-app
   * notice feed is enough, and `extra.byUserId` (carried straight into the eventHub payload, never
   * emailed) lets `unlocked` name the administrator who acted.
   *
   * Returns the email's promise rather than staying `void` (F6): a fire-and-forget caller can
   * still ignore it exactly as before, but the CLI reset command needs to `await` it -- it calls
   * `notify` and then `process.exit(0)`, which can tear the process down before a truly detached
   * promise ever resolves, silently dropping the reset email. The internal try/catch still
   * guarantees this promise never rejects, so nothing about the fire-and-forget call sites
   * (`verifyChallenge`, `assertPasswordAndFactor`, `controllers/mfa.ts`) needs to change.
   */
  const notify = (
    userId: string,
    type: MfaChangeNotice,
    extra: { byUserId?: string } = {}
  ): Promise<void> => {
    strapi.eventHub.emit(`admin.mfa.${type.replace(/_/g, '.')}`, { userId, ...extra });

    if (!isEmailedNotice(type)) {
      return Promise.resolve();
    }

    // Resolved outside the closure below while `type` is still narrowed to a `CHANGE_NOTICE_TEXT`
    // key (the `isEmailedNotice` guard above already returned for anything outside it) -- the
    // template must never receive the raw enum value (Finding 1: "authenticator_replaced" is not
    // a sentence).
    const change = CHANGE_NOTICE_TEXT[type];

    return (async () => {
      try {
        // Only the two fields the email actually needs -- not the password hash or the encrypted
        // TOTP secret sitting on the same row.
        const user = await userQuery().findOne({
          where: { id: userId },
          select: ['email', 'firstname'],
        });
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
              change,
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
   *  - the *newest* `recovery_codes_issued` row -- `areCodesAcknowledged` (below) reads only this
   *    one, by the same `createdAt` desc, `id` desc ordering, so it is the only marker actually
   *    protecting anything. An older marker from a prior enrolment or regenerate protects nothing
   *    and is prunable like any other row -- exempting every marker ever issued would let an
   *    account that regenerates repeatedly accumulate them forever, exactly the unbounded growth
   *    this function exists to stop.
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

    // The same lookup `areCodesAcknowledged` does: the newest marker, if any, is the only one
    // worth protecting.
    const newestMarker = await eventQuery().findOne({
      where: { userId: String(userId), type: 'recovery_codes_issued' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const { userAttemptWindow } = config();
    const attemptWindowStart = new Date(Date.now() - userAttemptWindow * 1000);

    await eventQuery().deleteMany({
      where: {
        userId: String(userId),
        createdAt: { $lt: new Date(cutoff.createdAt) },
        $and: [
          newestMarker
            ? {
                $or: [{ type: { $ne: 'recovery_codes_issued' } }, { id: { $ne: newestMarker.id } }],
              }
            : { type: { $ne: 'recovery_codes_issued' } },
          {
            $or: [
              { type: { $ne: 'challenge_failed' } },
              { createdAt: { $lte: attemptWindowStart } },
            ],
          },
        ],
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

    // The submitted code is normalised above only to decide which branch to take -- the TOTP
    // branch itself must still receive a whitespace-stripped code, not the raw submission:
    // `verifyTotp` only trims leading/trailing whitespace, so a display-formatted code like
    // "123 456" (some authenticator apps group digits) would dispatch here correctly (6 digits
    // once spaces are stripped) and then fail the digit check on the untouched original, rejecting
    // a genuinely valid code.
    if (normalised.length <= MAX_TOTP_CODE_LENGTH) {
      const totpResult = await attemptTotp(challenge.userId, code.replace(/\s+/g, ''));

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
   * The second-factor half of the re-authentication gate: a still-working TOTP code or an unused
   * recovery code, dispatched by the submitted code's own shape (never by a client-supplied
   * selector). Throttled and charged exactly like `verifyChallenge`. Shared by
   * `assertPasswordAndFactor` and by a replacement enrolment (`beginEnrolment` with a code).
   */
  const assertFactor = async (userId: string, code: string): Promise<void> => {
    if (await isAccountThrottled(userId)) {
      throw new RateLimitError();
    }

    const normalised = normaliseRecoveryCode(code);

    // Same reasoning as `verifyChallenge`'s dispatch: the TOTP branch needs the whitespace-stripped
    // code, not the raw submission, or a display-formatted code with an internal space dispatches
    // correctly but then fails `verifyTotp`'s digit check.
    if (normalised.length <= MAX_TOTP_CODE_LENGTH) {
      const totpResult = await verifyTotpForUser(userId, code.replace(/\s+/g, ''));
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

    await assertFactor(userId, code);
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
        data: {
          mfaSecret: null,
          mfaPendingSecret: null,
          mfaEnabledAt: null,
          mfaLastUsedStep: null,
        },
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
    isExemptFromMfa,
    isMfaRequiredFor,
    enforce,
    unlock,
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
    assertFactor,
    assertPasswordAndFactor,
    disable,
    sweepExpiredChallenges,
  };
};

export default createMfaService;
