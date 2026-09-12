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
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { MFA_DEFAULTS, validateMfaConfig, type MfaConfig } from '../config/mfa';
import mfaChangedTemplate from '../config/email-templates/mfa-changed';
import type {
  MfaAuditOnlyNotice,
  MfaEventNotice,
  MfaEventType,
} from '../../../shared/contracts/mfa';
import {
  readMfaEnforcement,
  readPasskeySettings,
  readTrustedDeviceSettings,
} from './security-settings';
import type { MfaEnforcement } from '../../../shared/contracts/security-settings';
import { createTrustedDevices } from './mfa-trusted-devices';
import { createPasskeys, PASSKEYS_DISABLED, PASSKEY_NEEDS_TOTP } from './mfa-passkeys';

const { ApplicationError, RateLimitError, ValidationError } = errors;

export const FUTURE_FLAG = 'unstableAdminMfa';

const USER_UID = 'admin::user';
const RECOVERY_CODE_UID = 'admin::mfa-recovery-code';
const CHALLENGE_UID = 'admin::mfa-challenge';
const EVENT_UID = 'admin::mfa-event';

const MAX_TOTP_CODE_LENGTH = 8;

const RECOVERY_CODE_LENGTH = 10;

/** Well above anything the attempt caps produce: `pruneEvents`' exemptions, not this cap, are what
 * `isAccountThrottled` relies on. */
export const MAX_EVENTS_PER_USER = 500;

export type { MfaEventType };

/** Every field is optional, so an undeclared key is only rejected in a literal passed directly.
 * "Nothing declared here is a secret", not "nothing else reaches the database". */
export type MfaEventMetadata = {
  loginAt?: string;
  deviceName?: string;
  via?: 'cli';
  graceUntil?: string;
  byUserId?: string;
  days?: number;
  count?: number;
};

export type VerifyChallengeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'unusable' | 'exhausted' | 'invalid' | 'throttled' };

export type EnforceOutcome =
  | { outcome: 'none' }
  | { outcome: 'grace'; graceUntil: Date }
  | { outcome: 'refused' };

/** Roles are optional: the login path does not populate them, so the resolver loads them rather
 * than read "not populated" as "no roles". */
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

/** The two passkey registration functions are wrapped rather than re-exported, so their invariants
 * hold for any caller and not only `controllers/mfa.ts`. */
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

  /** Enrolment data is left intact when off, so re-enabling restores the previous state. */
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

  /** Memoised onto the row: `isMfaRequiredFor` can need roles twice in one call and both reads
   * must agree. */
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

  /** Mirrors `ee/server/src/utils/sso-lock.ts` (CE cannot import from `ee/`) **including its
   * uncoerced `lockedId === String(role.id)` comparison**: widening it would exempt from MFA a
   * password-holding user EE never actually locked out of local login. */
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

  /** One conditional UPDATE each; read-then-write would let a refresh-path lock race an
   * administrator's unlock and silently win. */
  const stampGrace = async (userId: string, graceUntil: Date): Promise<boolean> => {
    const { count } = await userQuery().updateMany({
      where: { id: userId, mfaGraceUntil: null, mfaLockedAt: null },
      data: { mfaGraceUntil: graceUntil },
    });
    return count === 1;
  };

  /** The `$lte now` precondition fails the lock if anything rewrote `mfaGraceUntil` since the read. */
  const lockAccount = async (userId: string, now: Date): Promise<boolean> => {
    const { count } = await userQuery().updateMany({
      where: { id: userId, mfaLockedAt: null, mfaGraceUntil: { $lte: now } },
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
    // User id only, never anything session- or token-shaped.
    strapi.log.warn(
      `Admin session origin is not registered; sessions for admin user ${userId} were not invalidated on lock.`
    );
  };

  /** Reloads the row itself, so callers may pass a partial user. `retried` bounds the single re-read
   * taken when a conditional update finds its precondition gone. */
  const evaluateEnforcement = async (
    user: { id: Data.ID },
    retried: boolean
  ): Promise<EnforceOutcome> => {
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
      if (retried) {
        strapi.log.warn(
          `Two-factor enforcement could not stamp or lock admin user ${userId} after a retry; refusing the session.`
        );
        return { outcome: 'refused' };
      }
      return evaluateEnforcement(user, true);
    }

    const graceUntil = new Date(row.mfaGraceUntil);
    if (graceUntil > now) {
      return { outcome: 'grace', graceUntil };
    }

    if (await lockAccount(userId, now)) {
      // Sessions first: a failing event write must never leave a live session past the lock.
      await invalidateAllSessions(userId);
      await recordEvent(userId, 'locked', { graceUntil: graceUntil.toISOString() });
      notify(userId, 'locked');
      return { outcome: 'refused' };
    }

    // Precondition gone: an unlock landed between the read and the lock. Re-read once.
    if (retried) {
      strapi.log.warn(
        `Two-factor enforcement could not stamp or lock admin user ${userId} after a retry; refusing the session.`
      );
      return { outcome: 'refused' };
    }
    return evaluateEnforcement(user, true);
  };

  const enforce = (user: { id: Data.ID }): Promise<EnforceOutcome> =>
    evaluateEnforcement(user, false);

  /** No grace is stamped here: the user's next session starts a fresh window, so an unlock while
   * they are away cannot re-lock them unseen. */
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
   * Everything this feature stored about a user, for when the user itself is deleted. Not
   * `disable`: that nulls the MFA columns on the user row, which bumps its `updatedAt` and so
   * changes the row the delete response echoes back -- pointless work on a row about to go. The
   * event rows are included here and not in `disable`, where the notice feed still needs them.
   */
  const purgeUser = async (userId: string): Promise<void> => {
    await strapi.db.transaction(async () => {
      await recoveryQuery().deleteMany({ where: { userId: String(userId) } });
      await challengeQuery().deleteMany({ where: { userId: String(userId) } });
      await trustedDevices.clearTrustedDevices(userId);
      await passkeys.clearPasskeys(userId);
      await eventQuery().deleteMany({ where: { userId: String(userId) } });
    });
  };

  /** The only operation that lowers someone's protection without their consent, hence the session
   * eviction: a reset prompted by a suspected compromise must not leave the attacker signed in. */
  const resetUser = async (
    userId: string,
    actor: { byUserId?: string; via?: 'cli' } = {}
  ): Promise<void> => {
    await disable(userId);

    // Before the event write, which must never leave an attacker holding a live session.
    await invalidateAllSessions(userId);

    await recordEvent(userId, 'reset', {
      ...(actor.byUserId ? { byUserId: actor.byUserId } : {}),
      ...(actor.via ? { via: actor.via } : {}),
    });

    return notify(userId, 'reset', actor.byUserId ? { byUserId: actor.byUserId } : {});
  };

  /** Both calls must sit inside the guard: `encryption.decrypt` and `base32Decode` throw rather than
   * returning null, so a malformed stored value otherwise becomes an unhandled 500. */
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

  /** `bcryptjs.compare(pw, null)` *rejects* rather than returning false, so without the first guard
   * an SSO-only administrator gets a 500 instead of a clean refusal. */
  const assertPassword = async (
    user: { password?: string | null },
    password: string
  ): Promise<void> => {
    if (!user.password) {
      throw new ValidationError(
        'Your account has no local password, so it cannot manage two-factor authentication. Ask an administrator who signs in with a password.'
      );
    }
    if (!(await auth.validatePassword(password, user.password))) {
      throw new ValidationError('Invalid credentials');
    }
  };

  const beginEnrolment = async (userId: string, password: string, code?: string) => {
    const user = await loadUser(userId);

    await assertPassword(user, password);

    // The password alone is the credential 2FA exists to back up, so it cannot authorise swapping
    // the factor.
    if (user.mfaEnabledAt && user.mfaSecret) {
      if (!code) {
        throw new ValidationError(
          'A current two-factor code or a recovery code is required to replace your authenticator'
        );
      }
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

    // Pending, never active: the next attempt overwrites it, so an abandoned flow needs no cleanup.
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

  /** The replay guard: one conditional UPDATE whose affected-row count is the decision, so two
   * concurrent requests carrying the same code cannot both succeed. */
  const consumeTotpStep = async (userId: string, step: number): Promise<boolean> => {
    const metadata = strapi.db.metadata.get(USER_UID);
    const { tableName } = metadata;
    // @ts-expect-error - columnName exists only on scalar attributes. Optional chaining guards a
    // missing attribute so the ApplicationError below surfaces instead of a TypeError.
    const lastUsedStepColumn: string | undefined = metadata.attributes.mfaLastUsedStep?.columnName;

    if (!lastUsedStepColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::user.mfaLastUsedStep'
      );
    }

    // A single watermark, not a set of spent steps: with `window.back` set, a legitimate code for
    // an earlier step is refused once a later one has been spent.
    const affected = await strapi.db
      .getConnection(tableName)
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

    // Steps are wall-clock indices shared by both secrets, so one guard covers both. A
    // replacement must not reset `mfaLastUsedStep`, or a code accepted here replays at login.
    const consumed = await consumeTotpStep(userId, result.step);
    if (!consumed) {
      throw new ValidationError('Invalid code');
    }

    const replaced = Boolean(user.mfaEnabledAt && user.mfaSecret);

    // `issueRecoveryCodes` deletes the existing set first, so committing it alone would rotate a
    // replacing user's codes to values the errored response never returned. `mfaPendingSecret` is in
    // the `where`, so a `disable` racing in between is not silently undone.
    const recoveryCodes = await strapi.db.transaction(async () => {
      const codes = await issueRecoveryCodes(userId);

      const { count } = await userQuery().updateMany({
        where: { id: userId, mfaPendingSecret: user.mfaPendingSecret },
        data: {
          mfaSecret: user.mfaPendingSecret,
          mfaPendingSecret: null,
          mfaEnabledAt: replaced ? user.mfaEnabledAt : new Date(),
          // Enrolling satisfies any enforcement requirement. Clearing the lock is defensive: it
          // cannot be set on an account holding a session.
          mfaGraceUntil: null,
          mfaLockedAt: null,
        },
      });

      if (count !== 1) {
        throw new ValidationError('No enrolment in progress');
      }

      // The trusts on file were granted against the authenticator just retired.
      if (replaced) {
        await trustedDevices.clearTrustedDevices(userId);
      }

      return codes;
    });

    return { recoveryCodes, replaced };
  };

  // --- Recovery codes ---------------------------------------------------

  const recoveryQuery = () => strapi.db.query(RECOVERY_CODE_UID);

  /** bcrypt-hashed rather than encrypted, so a rotated `ENCRYPTION_KEY` cannot take the escape hatch
   * with it -- rotation is the exact moment a user needs these (ASVS 6.5.2). */
  const issueRecoveryCodes = async (userId: string): Promise<string[]> => {
    const codes = generateRecoveryCodes(config().recoveryCodeCount);
    const data = await Promise.all(
      codes.map(async (code) => ({
        userId: String(userId),
        codeHash: await auth.hashPassword(code),
        usedAt: null,
      }))
    );

    // One transaction: a `createMany` failure after the delete commits would leave the account
    // with zero recovery codes and no way to get any.
    await strapi.db.transaction(async () => {
      await recoveryQuery().deleteMany({ where: { userId: String(userId) } });

      // `recoveryCodeCount: 0` is valid config. Rather than trust every query engine to no-op on
      // an empty `createMany`, skip it.
      if (data.length > 0) {
        await recoveryQuery().createMany({ data });
      }

      // A fresh, unacknowledged marker every time, so `areCodesAcknowledged` never reports a stale
      // acknowledgement of codes already replaced.
      await recordEvent(userId, 'recovery_codes_issued');
    });

    return codes;
  };

  const countUnusedRecoveryCodes = (userId: string): Promise<number> =>
    recoveryQuery().count({ where: { userId: String(userId), usedAt: null } });

  /** Verification is separated from the consume, which is `consumeTotpStep`'s conditional UPDATE. */
  const consumeRecoveryCode = async (userId: string, code: string): Promise<boolean> => {
    const normalised = normaliseRecoveryCode(code);
    if (!normalised) {
      return false;
    }

    // Resolved before any candidate is fetched, so a broken column mapping surfaces on every call
    // rather than only when a submitted code happens to match.
    const metadata = strapi.db.metadata.get(RECOVERY_CODE_UID);
    const { tableName } = metadata;
    // @ts-expect-error - columnName exists only on scalar attributes; the union type does not
    // know that.
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
      // Sequential: no reason to burn every bcrypt comparison once one matches.
      // eslint-disable-next-line no-await-in-loop
      const matches = await auth.validatePassword(normalised, candidate.codeHash);
      if (!matches) {
        continue;
      }

      // Conditional update: whoever flips usedAt from null wins, so a code cannot be spent twice
      // by two concurrent requests.
      const affected = await strapi.db
        .getConnection(tableName)
        .where({ id: candidate.id })
        .whereNull(usedAtColumn)
        .update({ [usedAtColumn]: new Date() });

      return affected === 1;
    }

    return false;
  };

  // --- Challenge lifecycle and two-tier rate limiting -------------------
  // Two tiers because either alone is a bypass: the per-challenge cap is exact, and the per-account
  // one stops an attacker with a valid password minting a fresh challenge after every few guesses
  // (NIST SP 800-63B). Expiry is enforced lazily on read, so a sweep that never runs cannot make a
  // stale challenge usable.

  const challengeQuery = () => strapi.db.query(CHALLENGE_UID);
  const eventQuery = () => strapi.db.query(EVENT_UID);

  /** A migration problem must surface as an error, not as an UPDATE that affects nothing and so
   * reads as "cap already reached". */
  const challengeTable = () => {
    const metadata = strapi.db.metadata.get(CHALLENGE_UID);
    const { tableName } = metadata;
    // @ts-expect-error - columnName exists only on scalar attributes; the union type does not
    // know that.
    const attemptsColumn: string | undefined = metadata.attributes.attempts?.columnName;

    if (!attemptsColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::mfa-challenge.attempts'
      );
    }

    return { tableName, attemptsColumn };
  };

  /** Metadata is neutral context only: these rows are readable wherever admin data is. */
  const recordEvent = async (
    userId: string,
    type: MfaEventType,
    metadata: MfaEventMetadata = {}
  ): Promise<void> => {
    await eventQuery().create({ data: { userId: String(userId), type, metadata, seenAt: null } });

    // `recordEvent` runs inside `issueRecoveryCodes`' transaction, so an uncaught prune failure would
    // roll back the codes just written. Awaited, not detached: a floating promise inside an ambient
    // transaction either escapes it or dangles past it.
    try {
      await pruneEvents(userId);
    } catch (error) {
      strapi.log.error('Failed to prune admin::mfa-event rows', error);
    }
  };

  /**
   * Derived so it cannot drift from the row types. The exclusions are rows `recordEvent` alone
   * serves: emailing every recovery-code use would tell an attacker who has already stolen one that
   * the account holder is about to find out.
   */
  type MfaChangeNotice =
    | Exclude<MfaEventType, 'recovery_code_used' | 'recovery_codes_issued' | 'grace_started'>
    | MfaAuditOnlyNotice;

  /** Written out rather than derived, so a new hub-only notice cannot start demanding an email
   * phrase. */
  type EmailedNotice = 'enabled' | 'disabled' | 'reset' | 'authenticator_replaced';

  const EMAILED_NOTICES: ReadonlySet<MfaChangeNotice> = new Set<EmailedNotice>([
    'enabled',
    'disabled',
    'reset',
    'authenticator_replaced',
  ]);

  const isEmailedNotice = (type: MfaChangeNotice): type is EmailedNotice =>
    EMAILED_NOTICES.has(type);

  /** Keyed on `EmailedNotice`, so the typecheck holds it exhaustive. */
  const CHANGE_NOTICE_TEXT: Record<EmailedNotice, string> = {
    enabled: 'enabled',
    disabled: 'disabled',
    reset: 'reset',
    authenticator_replaced: 'moved to a new authenticator app',
  };

  /**
   * Fire and forget, as `forgotPassword` is: many self-hosted instances configure no provider, so
   * email cannot be a hard dependency of a security control.
   *
   * The hub event fires for every notice type and is how EE audit logging observes them. Email goes
   * only to `EmailedNotice` -- mailing every wrong code would let anyone who knows the password
   * flood the account holder's inbox. The returned promise never rejects; only the CLI awaits it.
   */
  const notify = (
    userId: string,
    type: MfaChangeNotice,
    extra: { byUserId?: string; count?: number } = {}
  ): Promise<void> => {
    strapi.eventHub.emit(`admin.mfa.${type.replace(/_/g, '.')}`, { userId, ...extra });

    if (!isEmailedNotice(type)) {
      return Promise.resolve();
    }

    const change = CHANGE_NOTICE_TEXT[type];

    return (async () => {
      try {
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
   * Caps the `admin::mfa-event` rows one account can accumulate. Two exemptions, at any age:
   *  - the *newest* `recovery_codes_issued` row, the only marker `areCodesAcknowledged` reads.
   *    Exempting every marker instead would let a repeatedly regenerating account grow forever.
   *  - a `challenge_failed` row inside `userAttemptWindow`, which `isAccountThrottled` counts.
   *    Pruning one early lets an attacker outlast the throttle by generating other traffic.
   */
  const pruneEvents = async (userId: string): Promise<void> => {
    const total = await eventQuery().count({ where: { userId: String(userId) } });
    if (total <= MAX_EVENTS_PER_USER) {
      return;
    }

    const [cutoff] = await eventQuery().findMany({
      where: { userId: String(userId) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      offset: MAX_EVENTS_PER_USER - 1,
      limit: 1,
    });

    if (!cutoff) {
      return;
    }

    // The newest marker is the only one `areCodesAcknowledged` reads, so the only one worth keeping.
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

  // --- Trusted devices ------------------------------------------
  // `settings` is injected rather than imported inside the module, so its tests can hand it any
  // policy without a store double.
  const trustedDevices = createTrustedDevices({
    strapi,
    settings: () => readTrustedDeviceSettings(strapi),
    recordEvent,
    notify,
  });

  /** Only `acknowledgeCodes` may ever clear the marker, even if a caller passes its id in `ids`. */
  const NOT_ACKNOWLEDGEMENT_MARKER = { $ne: 'recovery_codes_issued' as const };

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
   * `userId` is always in the `where` and `ids` only narrows further, so a foreign id can never
   * reach another user's row. An *absent* `ids` marks everything; an *empty* array marks nothing.
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
   * Reads only the newest marker, or an already-acknowledged older one makes a just-regenerated set
   * read as acknowledged. Ordered by `createdAt` *and* `id`, because two can share a millisecond.
   */
  const areCodesAcknowledged = async (userId: string): Promise<boolean> => {
    const latest = await eventQuery().findOne({
      where: { userId: String(userId), type: 'recovery_codes_issued' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return Boolean(latest?.seenAt);
  };

  const acknowledgeCodes = async (userId: string): Promise<void> => {
    await eventQuery().updateMany({
      where: { userId: String(userId), type: 'recovery_codes_issued', seenAt: null },
      data: { seenAt: new Date() },
    });
  };

  /**
   * Approximate under concurrency, deliberately: this is the backstop against sustained challenge
   * recycling, while the exact per-challenge limit is the conditional increment in `verifyChallenge`.
   */
  const isAccountThrottled = async (userId: string): Promise<boolean> => {
    const { maxUserAttempts, userAttemptWindow } = config();
    const since = new Date(Date.now() - userAttemptWindow * 1000);

    const failures = await eventQuery().count({
      where: { userId: String(userId), type: 'challenge_failed', createdAt: { $gt: since } },
    });

    return failures >= maxUserAttempts;
  };

  // --- Passkeys -------------------------------------------------
  // Not beside the trusted-device composition above: this needs `isAccountThrottled`, and a `const`
  // is hoisted uninitialised, so composing earlier throws a TDZ ReferenceError at construction.
  const passkeys = createPasskeys({
    strapi,
    settings: () => readPasskeySettings(strapi),
    config,
    recordEvent,
    notify,
    isAccountThrottled,
  });

  /**
   * Duplicated from `controllers/mfa.ts` so the service is safe for any caller. The controller keeps
   * its copy for the ordering, which is what stops an attempt being spent on a doomed request.
   */
  const assertPasskeyRegistrationAllowed = async (userId: string): Promise<void> => {
    if (!(await readPasskeySettings(strapi)).enabled) {
      throw new ValidationError(PASSKEYS_DISABLED);
    }
    if (!(await isEnrolled(userId))) {
      throw new ValidationError(PASSKEY_NEEDS_TOTP);
    }
  };

  const createChallenge = async (userId: string): Promise<{ token: string; expiresIn: number }> => {
    // Checked here as well as in `verifyChallenge`: throttling only one of the two leaves the
    // other as the way around it.
    if (await isAccountThrottled(userId)) {
      throw new RateLimitError();
    }

    const { challengeTtl } = config();
    // Sized as a credential: it is the only thing between an accepted password and a session.
    const token = crypto.randomBytes(32).toString('hex');

    await challengeQuery().create({
      data: {
        token,
        userId: String(userId),
        // Not `'totp'`: nothing reads this column to dispatch, and either factor may satisfy the row.
        factorType: 'any',
        attempts: 0,
        expiresAt: new Date(Date.now() + challengeTtl * 1000),
        consumedAt: null,
      },
    });

    return { token, expiresIn: challengeTtl };
  };

  /** The DELETE is the consume: whoever removes the row wins, so a token cannot authorise two
   * operations even if both requests present a valid factor. */
  const consumeChallenge = async (id: unknown, userId: string): Promise<VerifyChallengeResult> => {
    const { tableName } = challengeTable();
    const affected = await strapi.db.getConnection(tableName).where({ id }).del();

    return affected === 1
      ? { ok: true as const, userId }
      : { ok: false as const, reason: 'unusable' as const };
  };

  /**
   * For `verifyChallenge` only, where an unreadable secret must read as "did not match" rather than
   * throw: propagating would make the recovery-code escape hatch unreachable at the one endpoint
   * that accepts it, and would skip the `challenge_failed` event that feeds the throttle.
   */
  const attemptTotp = async (userId: string, code: string) => {
    try {
      return await verifyTotpForUser(userId, code);
    } catch (error) {
      // Fires only on a broken or absent secret, never on an ordinary wrong code, so it cannot be used
      // to flood the log.
      strapi.log.warn(
        `Two-factor verification could not check a TOTP code for admin user ${userId}. A recovery code is the way back into this account. Cause: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { valid: false as const };
    }
  };

  /** No client-supplied factor selector: letting the caller pick which check runs is the classic
   * factor-switching bypass. */
  const verifyChallenge = async (token: string, code: string): Promise<VerifyChallengeResult> => {
    const challenge = await challengeQuery().findOne({ where: { token } });

    if (!challenge || challenge.consumedAt) {
      return { ok: false as const, reason: 'unusable' as const };
    }

    // Fails closed: `new Date('nonsense') <= new Date()` is false, so a malformed `expiresAt` would
    // otherwise be a challenge that never expires.
    const expiresAt = new Date(challenge.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return { ok: false as const, reason: 'unusable' as const };
    }

    if (await isAccountThrottled(challenge.userId)) {
      return { ok: false as const, reason: 'throttled' as const };
    }

    // `returning` would be the obvious way to judge the new value, but it is unsupported on MySQL.
    // Runs *before* any code is checked, so a crash mid-verification still costs an attempt.
    const { tableName, attemptsColumn } = challengeTable();
    const accepted = await strapi.db
      .getConnection(tableName)
      .where({ id: challenge.id })
      .where(attemptsColumn, '<', config().maxChallengeAttempts)
      .increment(attemptsColumn, 1);

    if (accepted !== 1) {
      // Destroyed rather than left as a dead row a later path could revive by resetting the counter.
      await challengeQuery().deleteMany({ where: { id: challenge.id } });
      return { ok: false as const, reason: 'exhausted' as const };
    }

    // Dispatch on the code's own shape, never on a client-supplied selector -- that is the
    // factor-switching bypass. It also stops a wrong 6-digit code buying one bcrypt per unused
    // recovery code on an unauthenticated endpoint.
    const normalised = normaliseRecoveryCode(code);

    // The TOTP branch needs the whitespace-stripped code, not the raw submission: `verifyTotp` only
    // trims the ends, so a display-formatted "123 456" dispatches here and then fails its digit check.
    if (normalised.length <= MAX_TOTP_CODE_LENGTH) {
      const totpResult = await attemptTotp(challenge.userId, code.replace(/\s+/g, ''));

      // Single-use across the account, not within one challenge, so a spent code cannot be replayed
      // against a freshly created one (RFC 6238 section 5.2).
      if (totpResult.valid && (await consumeTotpStep(challenge.userId, totpResult.step))) {
        return consumeChallenge(challenge.id, challenge.userId);
      }
    }

    if (
      normalised.length === RECOVERY_CODE_LENGTH &&
      (await consumeRecoveryCode(challenge.userId, code))
    ) {
      await recordEvent(challenge.userId, 'recovery_code_used');
      return consumeChallenge(challenge.id, challenge.userId);
    }

    // Also reached when the code matched no factor's shape. A path that charges one tier but not the
    // other is a hole in the other.
    await recordEvent(challenge.userId, 'challenge_failed');
    notify(challenge.userId, 'challenge_failed');
    return { ok: false as const, reason: 'invalid' as const };
  };

  const assertFactor = async (userId: string, code: string): Promise<void> => {
    if (await isAccountThrottled(userId)) {
      throw new RateLimitError();
    }

    const normalised = normaliseRecoveryCode(code);

    if (normalised.length <= MAX_TOTP_CODE_LENGTH) {
      const totpResult = await verifyTotpForUser(userId, code.replace(/\s+/g, ''));
      if (totpResult.valid && (await consumeTotpStep(userId, totpResult.step))) {
        return;
      }
    }

    if (normalised.length === RECOVERY_CODE_LENGTH && (await consumeRecoveryCode(userId, code))) {
      await recordEvent(userId, 'recovery_code_used');
      return;
    }

    await recordEvent(userId, 'challenge_failed');
    notify(userId, 'challenge_failed');
    throw new ValidationError('Invalid code');
  };

  /**
   * The gate for disable and regenerate -- both are the "attacker holds a session" case. Uses
   * `verifyTotpForUser`, not `attemptTotp`, so the "secret could not be read" error survives; a
   * recovery-shaped code never reaches that branch, so an account with an undecryptable secret can
   * still be disabled.
   */
  const assertPasswordAndFactor = async (
    userId: string,
    password: string,
    code: string
  ): Promise<void> => {
    const user = await loadUser(userId);

    // Wrong password is not a second-factor attempt: it charges neither throttle tier.
    await assertPassword(user, password);

    await assertFactor(userId, code);
  };

  /**
   * One transaction, all of it: a failure on the user `update` alone leaves `mfaEnabledAt` set with
   * the recovery codes already deleted -- a permanent lockout with no way back but the CLI reset.
   */
  const disable = async (userId: string): Promise<void> => {
    await strapi.db.transaction(async () => {
      await recoveryQuery().deleteMany({ where: { userId: String(userId) } });
      await challengeQuery().deleteMany({ where: { userId: String(userId) } });
      await trustedDevices.clearTrustedDevices(userId);
      // A passkey that still satisfied challenges would be a second factor on an account that has
      // none. The pending-ceremony columns are nulled in the same update.
      await passkeys.clearPasskeys(userId);
      await userQuery().update({
        where: { id: userId },
        data: {
          mfaSecret: null,
          mfaPendingSecret: null,
          mfaEnabledAt: null,
          mfaLastUsedStep: null,
          mfaPasskeyChallenge: null,
          mfaPasskeyChallengeExpiresAt: null,
        },
      });
    });
  };

  /**
   * Housekeeping: expired challenges are already rejected on read, so nothing depends on this
   * running. The DELETE is unbounded by choice -- `createChallenge` is throttled and rate limited,
   * so the expired set stays small.
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
    resetUser,
    purgeUser,
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
    trustDevice: trustedDevices.trustDevice,
    consumeTrustedDevice: trustedDevices.consumeTrustedDevice,
    listTrustedDevices: trustedDevices.listTrustedDevices,
    revokeTrustedDevice: trustedDevices.revokeTrustedDevice,
    revokeAllTrustedDevices: trustedDevices.revokeAllTrustedDevices,
    clearTrustedDevices: trustedDevices.clearTrustedDevices,
    clearAllTrustedDevices: trustedDevices.clearAllTrustedDevices,
    sweepExpiredTrustedDevices: trustedDevices.sweepExpiredTrustedDevices,
    trustedDeviceSettings: trustedDevices.trustedDeviceSettings,
    async passkeyRegistrationOptions(userId: string) {
      await assertPasskeyRegistrationAllowed(userId);
      return passkeys.passkeyRegistrationOptions(userId);
    },
    async registerPasskey(userId: string, name: string, registration: RegistrationResponseJSON) {
      await assertPasskeyRegistrationAllowed(userId);
      return passkeys.registerPasskey(userId, name, registration);
    },
    listPasskeys: passkeys.listPasskeys,
    countPasskeys: passkeys.countPasskeys,
    deletePasskey: passkeys.deletePasskey,
    clearPasskeys: passkeys.clearPasskeys,
    clearAllPasskeys: passkeys.clearAllPasskeys,
    authenticationOptions: passkeys.authenticationOptions,
    verifyAssertion: passkeys.verifyAssertion,
    passkeySettings: passkeys.passkeySettings,
    passkeysConfigured: passkeys.passkeysConfigured,
    warnIfPasskeysMisconfigured: passkeys.warnIfPasskeysMisconfigured,
  };
};

export default createMfaService;
