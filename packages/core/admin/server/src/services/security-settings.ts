import { errors } from '@strapi/utils';
import type { Core, Data } from '@strapi/types';
import type {
  MfaEnforcement,
  MfaEnforcementMode,
  PasskeySettings,
  SecuritySettings,
  TrustedDeviceSettings,
  UpdateSecuritySettings,
} from '../../../shared/contracts/security-settings';
import { MFA_ERROR_CODES } from '../../../shared/utils/mfa-error-codes';
import { SUPER_ADMIN_CODE } from '../../../shared/utils/super-admin';
import {
  enforcedRoleIds,
  isPasskeysDisable,
  isSecurityDowngrade,
  isTrustedDevicesDowngrade,
} from '../../../shared/utils/security-downgrade';

const { ValidationError } = errors;

export const SECURITY_SETTINGS_KEY = 'security-settings';

export const MFA_ENFORCEMENT_MODES: readonly MfaEnforcementMode[] = ['off', 'optional', 'required'];

export const DEFAULT_MFA_ENFORCEMENT: MfaEnforcement = { mode: 'off', graceDays: 7 };

export const MIN_GRACE_DAYS = 1;
export const MAX_GRACE_DAYS = 30;

export const DEFAULT_TRUSTED_DEVICES: TrustedDeviceSettings = { enabled: true, days: 30 };

export const MIN_TRUST_DAYS = 1;
export const MAX_TRUST_DAYS = 90;

export const DEFAULT_PASSKEYS: PasskeySettings = { enabled: true };

/** `requiredRoles` lives on `admin::role`, not here. */
export interface StoredSecuritySettings {
  mfa?: Partial<MfaEnforcement>;
  trustedDevices?: Partial<TrustedDeviceSettings>;
  passkeys?: Partial<PasskeySettings>;
}

const isMode = (value: unknown): value is MfaEnforcementMode =>
  typeof value === 'string' && (MFA_ENFORCEMENT_MODES as readonly string[]).includes(value);

const isGraceDays = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_GRACE_DAYS &&
  value <= MAX_GRACE_DAYS;

const isTrustDays = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_TRUST_DAYS &&
  value <= MAX_TRUST_DAYS;

const adminStore = (strapi: Core.Strapi) => strapi.store({ type: 'core', name: 'admin' });

type WarnableKey =
  | 'mode'
  | 'graceDays'
  | 'trustedDevices.enabled'
  | 'trustedDevices.days'
  | 'passkeys.enabled'
  | 'webauthn.rp';

/** The readers run on every session issue, so a persistently corrupt row would otherwise warn on
 * every login. Once per key per process instead. */
const warnedKeys = new Set<WarnableKey>();

/**
 * Exported so `resolveWebauthnRp` dedupes through the same surface. `level` and `prefix` exist for
 * that caller: an RP misconfiguration is an operator error with an action attached, and a config
 * fault rather than a stored-value one.
 */
export const warnOnce = (
  strapi: Core.Strapi,
  key: WarnableKey,
  message: string,
  level: 'warn' | 'error' = 'warn',
  prefix = '[security-settings]'
): void => {
  if (warnedKeys.has(key)) {
    return;
  }
  warnedKeys.add(key);
  const noun = level === 'error' ? 'message' : 'warning';
  strapi.log[level](`${prefix} ${message} (this ${noun} is logged once per process).`);
};

/** Test-only: clears the per-process dedupe. */
export const resetSecuritySettingsWarnings = (): void => {
  warnedKeys.clear();
};

/**
 * Read on every session issue, so it must never throw on a corrupt row: a bad value falls back to
 * the default for that key, which is `off` rather than anything that could lock a user out.
 *
 * This is the stored mode, which enforcement acts on. `getSettings` is what reports it: there,
 * `optional` with no role flagged reads as `off`.
 */
export const readMfaEnforcement = async (strapi: Core.Strapi): Promise<MfaEnforcement> => {
  const stored = (await adminStore(strapi).get({ key: SECURITY_SETTINGS_KEY })) as
    StoredSecuritySettings | null | undefined;
  const mfa = stored?.mfa ?? {};

  const mode = isMode(mfa.mode) ? mfa.mode : DEFAULT_MFA_ENFORCEMENT.mode;
  const graceDays = isGraceDays(mfa.graceDays) ? mfa.graceDays : DEFAULT_MFA_ENFORCEMENT.graceDays;

  if (mfa.mode !== undefined && !isMode(mfa.mode)) {
    warnOnce(
      strapi,
      'mode',
      `stored mfa.mode is not one of ${MFA_ENFORCEMENT_MODES.join(', ')}; using "${mode}"`
    );
  }
  if (mfa.graceDays !== undefined && !isGraceDays(mfa.graceDays)) {
    warnOnce(
      strapi,
      'graceDays',
      `stored mfa.graceDays is not an integer in ${MIN_GRACE_DAYS}..${MAX_GRACE_DAYS}; using ${graceDays}`
    );
  }

  return { mode, graceDays };
};

/** Same tolerance as `readMfaEnforcement`. The fallback is the default rather than `false`,
 * because a corrupt value is not a decision to turn the feature off. */
export const readTrustedDeviceSettings = async (
  strapi: Core.Strapi
): Promise<TrustedDeviceSettings> => {
  const stored = (await adminStore(strapi).get({ key: SECURITY_SETTINGS_KEY })) as
    StoredSecuritySettings | null | undefined;
  const raw = stored?.trustedDevices ?? {};

  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_TRUSTED_DEVICES.enabled;
  const days = isTrustDays(raw.days) ? raw.days : DEFAULT_TRUSTED_DEVICES.days;

  if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') {
    warnOnce(
      strapi,
      'trustedDevices.enabled',
      `stored trustedDevices.enabled is not a boolean; using ${enabled}`
    );
  }
  if (raw.days !== undefined && !isTrustDays(raw.days)) {
    warnOnce(
      strapi,
      'trustedDevices.days',
      `stored trustedDevices.days is not an integer in ${MIN_TRUST_DAYS}..${MAX_TRUST_DAYS}; using ${days}`
    );
  }

  return { enabled, days };
};

/**
 * Same tolerance as the other two readers. Falling back to `enabled: true` also means this can
 * never manufacture the "policy off with rows still present" state the verify route defends
 * against.
 */
export const readPasskeySettings = async (strapi: Core.Strapi): Promise<PasskeySettings> => {
  const stored = (await adminStore(strapi).get({ key: SECURITY_SETTINGS_KEY })) as
    StoredSecuritySettings | null | undefined;
  const raw = stored?.passkeys ?? {};

  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_PASSKEYS.enabled;

  if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') {
    warnOnce(
      strapi,
      'passkeys.enabled',
      `stored passkeys.enabled is not a boolean; using ${enabled}`
    );
  }

  return { enabled };
};

export const GUARD_MESSAGE = 'Enrol in two-factor authentication before requiring it for others';

/**
 * Pure, so it is cheap to evaluate twice: once outside the transaction to decide which credentials
 * to demand, and again inside against a re-read document.
 *
 * Without the second evaluation two saves race into a bypass. From `off`, a save raising to
 * `required` needs no credentials, and a concurrent one to `optional` reads the same `off` and
 * looks like a raise too. Whichever commits second has lowered the mode, unchallenged.
 */
const relaxingChanges = (
  previous: SecuritySettings,
  next: {
    mfa: { mode: MfaEnforcementMode; graceDays: number };
    requiredRoles: string[];
    trustedDevices: { enabled: boolean; days: number };
    passkeys: { enabled: boolean };
  }
) => {
  // The rules are shared with the admin client so its credential prompt cannot drift from them.
  const lowersEnforcement = isSecurityDowngrade(previous.mfa, {
    ...next.mfa,
    requiredRoles: next.requiredRoles,
  });
  const widensTrust = isTrustedDevicesDowngrade(previous.trustedDevices, next.trustedDevices);
  const disablesPasskeys = isPasskeysDisable(previous.passkeys, next.passkeys);

  return {
    lowersEnforcement,
    widensTrust,
    disablesPasskeys,
    any: lowersEnforcement || widensTrust || disablesPasskeys,
  };
};

interface MfaServiceLike {
  isExemptFromMfa(user: {
    id: Data.ID;
    password?: string | null;
    roles?: unknown;
  }): Promise<boolean>;
  isEnrolled(userId: string): Promise<boolean>;
  canEncryptSecrets(): boolean;
  assertPasswordAndFactor(userId: string, password: string, code: string): Promise<void>;
  clearAllTrustedDevices(): Promise<number>;
  /** Every passkey row, every user. Called on the transition to `enabled: false`. */
  clearAllPasskeys(): Promise<number>;
}

interface AuthServiceLike {
  validatePassword(password: string, hash: string): Promise<boolean>;
}

export interface SecuritySettingsDeps {
  strapi: Core.Strapi;
}

/**
 * Owner of the `security-settings` store document and of `admin::role.mfaRequired`. The role flag
 * is written only here -- never through the role API -- so the guard and the downgrade
 * re-authentication have exactly one place to live, and the Super Admin role (which the role API
 * refuses to edit at all) is handled like any other.
 */
export const createSecuritySettingsService = ({ strapi }: SecuritySettingsDeps) => {
  const roleQuery = () => strapi.db.query('admin::role');
  const userQuery = () => strapi.db.query('admin::user');
  const mfa = () => strapi.service('admin::mfa') as unknown as MfaServiceLike;
  const auth = () => strapi.service('admin::auth') as unknown as AuthServiceLike;

  const listRequiredRoleIds = async (): Promise<string[]> => {
    const roles = await roleQuery().findMany({ where: { mfaRequired: true }, select: ['id'] });
    return roles.map((role: { id: Data.ID }) => String(role.id));
  };

  /**
   * `optional` with no role flagged requires nobody, exactly like `off`, so it is reported as `off`
   * rather than as a configured state with nothing selected. Normalised here, on read, so a stored
   * `optional` from an install that predates the `off` default behaves the same. The stored value
   * is left alone: enforcement reads it, and nothing it decides changes.
   */
  const getSettings = async (): Promise<SecuritySettings> => {
    const enforcement = await readMfaEnforcement(strapi);
    const requiredRoles = await listRequiredRoleIds();
    const mode =
      enforcement.mode === 'optional' && requiredRoles.length === 0 ? 'off' : enforcement.mode;

    return {
      mfa: { ...enforcement, mode, requiredRoles },
      trustedDevices: await readTrustedDeviceSettings(strapi),
      passkeys: await readPasskeySettings(strapi),
    };
  };

  /**
   * A grace stamp on an account this save newly requires is stale: it was set the last time the
   * account was required, and its clock kept running since. Left in place, the account is locked
   * at its next session with no warning, so such stamps are cleared and the next session starts a
   * fresh window. Stamps of accounts already required keep running, and locks are never touched.
   *
   * Newly required: everyone, when enforcement was `off` (its clocks were paused); when raising
   * `optional` to `required`, everyone who held no enforced role; and under `optional`, holders of
   * an added role who held no enforced role before.
   */
  const restartStaleGrace = async (
    current: { mode: MfaEnforcementMode; requiredRoles: string[] },
    nextMode: MfaEnforcementMode,
    nextRoles: string[]
  ): Promise<void> => {
    if (nextMode === 'off') {
      return;
    }
    const stale = { mfaLockedAt: null, mfaGraceUntil: { $notNull: true } };

    if (current.mode === 'off') {
      await userQuery().updateMany({ where: stale, data: { mfaGraceUntil: null } });
      return;
    }
    if (current.mode === 'required') {
      return;
    }

    const wasEnforced = new Set(current.requiredRoles.map(String));
    const added = new Set(nextRoles.map(String).filter((id) => !wasEnforced.has(id)));
    if (nextMode === 'optional' && added.size === 0) {
      return;
    }

    const graced = (await userQuery().findMany({
      where: stale,
      select: ['id'],
      populate: { roles: { select: ['id'] } },
    })) as Array<{ id: Data.ID; roles?: Array<{ id: Data.ID }> | null }>;

    const ids = graced
      .filter((user) => {
        const held = (user.roles ?? []).map((role) => String(role.id));
        if (held.some((id) => wasEnforced.has(id))) {
          return false;
        }
        return nextMode === 'required' || held.some((id) => added.has(id));
      })
      .map((user) => user.id);

    if (ids.length > 0) {
      await userQuery().updateMany({
        where: { ...stale, id: { $in: ids } },
        data: { mfaGraceUntil: null },
      });
    }
  };

  const updateSettings = async (
    input: UpdateSecuritySettings.Request['body'],
    actor: { id: Data.ID }
  ): Promise<SecuritySettings> => {
    // Per-object: a present key replaces its object whole, an absent one is left as stored.
    if (!input.mfa && !input.trustedDevices && !input.passkeys) {
      throw new ValidationError('Provide mfa, trustedDevices or passkeys');
    }

    const previous = await getSettings();
    const nextMfa = input.mfa ?? previous.mfa;
    const nextTrusted = input.trustedDevices ?? previous.trustedDevices;
    const nextPasskeys = input.passkeys ?? previous.passkeys;
    const requiredRoles = Array.from(new Set(nextMfa.requiredRoles.map(String)));

    if (input.mfa && requiredRoles.length > 0) {
      const existing = await roleQuery().findMany({
        where: { id: { $in: requiredRoles } },
        select: ['id'],
      });
      if (existing.length !== requiredRoles.length) {
        throw new ValidationError('requiredRoles contains an unknown role id', {
          code: MFA_ERROR_CODES.UNKNOWN_ROLE,
        });
      }
    }

    const actorRow = await userQuery().findOne({ where: { id: actor.id }, populate: ['roles'] });
    if (!actorRow) {
      throw new ValidationError('User not found');
    }
    const actorRoleIds = new Set(
      ((actorRow.roles ?? []) as Array<{ id: Data.ID }>).map((role) => String(role.id))
    );
    const actorExempt = await mfa().isExemptFromMfa(actorRow);
    const actorEnrolled = await mfa().isEnrolled(String(actorRow.id));

    // The self-lockout guard: this write may not require a second factor of a caller who has none,
    // unless they are exempt from local login. A flag kept under `off` enforced nothing, so turning
    // it back on counts as adding it; a flag saved under `off` enforces nothing yet.
    const previouslyEnforced = enforcedRoleIds(previous.mfa);
    const addedRoles = requiredRoles.filter((id) => !previouslyEnforced.includes(id));
    const raisesToRequired = nextMfa.mode === 'required' && previous.mfa.mode !== 'required';
    const addsHeldRole =
      nextMfa.mode === 'optional' && addedRoles.some((id) => actorRoleIds.has(id));
    if (!actorExempt && !actorEnrolled && (raisesToRequired || addsHeldRole)) {
      throw new ValidationError(GUARD_MESSAGE, { code: MFA_ERROR_CODES.ENROL_FIRST });
    }

    // Requiring a factor nobody can enrol in only starts every affected user's clock towards a
    // lock. Any change that puts someone newly on the clock is refused until the key is set.
    const raises = raisesToRequired || (nextMfa.mode === 'optional' && addedRoles.length > 0);
    if (input.mfa && raises && !mfa().canEncryptSecrets()) {
      throw new ValidationError(
        'Two-factor authentication cannot be required while the admin encryption key is not configured. Set ENCRYPTION_KEY and restart.',
        { code: MFA_ERROR_CODES.NO_ENCRYPTION_KEY }
      );
    }

    // Security downgrades need re-authentication, exactly like `/mfa/disable`: session authority
    // alone is not enough when the session may be the thing an attacker holds.
    const nextValues = {
      mfa: nextMfa,
      requiredRoles,
      trustedDevices: nextTrusted,
      passkeys: nextPasskeys,
    };
    const { lowersEnforcement, widensTrust, disablesPasskeys } = relaxingChanges(
      previous,
      nextValues
    );

    if (lowersEnforcement || widensTrust || disablesPasskeys) {
      // An SSO-only account has no local credential to present. That dead end is acceptable for
      // lowering enforcement on your own account, but not for a feature toggle: in an SSO-only
      // organisation nobody could ever turn passkeys off. So `disablesPasskeys` alone proceeds on
      // session authority; combined with either other term it is refused.
      if (!actorRow.password && (lowersEnforcement || widensTrust)) {
        throw new ValidationError(
          'Your account has no local password, so it cannot lower two-factor authentication requirements. Ask an administrator who signs in with a password.',
          { code: MFA_ERROR_CODES.NO_LOCAL_PASSWORD_DOWNGRADE }
        );
      }
      if (actorRow.password) {
        if (!input.password) {
          throw new ValidationError('Your password is required to change two-factor settings');
        }
        if (actorEnrolled) {
          if (!input.code) {
            throw new ValidationError(
              'A two-factor code is required to change two-factor settings'
            );
          }
          await mfa().assertPasswordAndFactor(String(actorRow.id), input.password, input.code);
        } else if (!(await auth().validatePassword(input.password, actorRow.password))) {
          throw new ValidationError('Invalid credentials');
        }
      }
    }

    // What the caller actually proved. A password-less actor reaching here presented nothing --
    // the `disablesPasskeys`-only branch above lets them through on session authority -- so their
    // save is still unverified however it is re-evaluated below.
    const credentialsVerified =
      Boolean(actorRow.password) && (lowersEnforcement || widensTrust || disablesPasskeys);

    await strapi.db.transaction(async ({ trx }) => {
      // Serialises every save on Postgres and MySQL, the way `createFirstAdmin` serialises itself:
      // without it two saves both re-read the same settings below, both pass the re-check, and the
      // second commits over the first. The security-settings document may not exist yet, so it is
      // the Super Admin role row, which always does, that is locked. SQLite ignores FOR UPDATE and
      // has a single writer anyway.
      await strapi.db
        .queryBuilder('admin::role')
        .select(['id'])
        .where({ code: SUPER_ADMIN_CODE })
        .first()
        .transacting(trx)
        .forUpdate()
        .execute();

      // A concurrent save since the read at the top can turn what looked like a raise into a
      // relaxation. The credential check is not repeated -- bcrypt would hold the transaction open --
      // so a save whose requirement appeared only now is refused and the caller retries.
      //
      // The test is the same one the pre-check applied, against the settings as they are now: a
      // password holder was asked for credentials if anything relaxed, while a password-less
      // actor is allowed `disablesPasskeys` and nothing else. Asking only whether *something*
      // relaxes would refuse the uncontested SSO-only passkey toggle the branch above exists to
      // permit.
      const current = await getSettings();

      // An absent object is "left as stored" -- as stored *now*, not as read at the top. Written
      // from the earlier read, a save that only touched trusted devices would silently put back
      // whatever mode a concurrent save had just set, and would compare stale roles it never
      // writes against fresh ones, refusing itself for a change it was not making.
      const write = {
        mfa: input.mfa ? nextMfa : current.mfa,
        requiredRoles: input.mfa ? requiredRoles : current.mfa.requiredRoles,
        trustedDevices: input.trustedDevices ? nextTrusted : current.trustedDevices,
        passkeys: input.passkeys ? nextPasskeys : current.passkeys,
      };

      const now = relaxingChanges(current, write);
      const needsCredentials = actorRow.password
        ? now.any
        : now.lowersEnforcement || now.widensTrust;

      if (needsCredentials && !credentialsVerified) {
        throw new ValidationError(
          'Two-factor settings changed while this save was in flight. Review the current settings and try again.',
          { code: MFA_ERROR_CODES.SETTINGS_CONFLICT }
        );
      }

      // The document is always written whole, so an absent object is re-written as it now stands
      // rather than dropped.
      await adminStore(strapi).set({
        key: SECURITY_SETTINGS_KEY,
        value: {
          mfa: { mode: write.mfa.mode, graceDays: write.mfa.graceDays },
          trustedDevices: {
            enabled: write.trustedDevices.enabled,
            days: write.trustedDevices.days,
          },
          passkeys: { enabled: write.passkeys.enabled },
        },
      });

      // Left in place, these rows would let a later re-enable silently revive trusts granted under the
      // old policy. Deleted in the same transaction as the setting that forbids them.
      if (current.trustedDevices.enabled && !write.trustedDevices.enabled) {
        await mfa().clearAllTrustedDevices();
      }

      // The same cascade, for the same reason -- and why this `PUT` carries credentials.
      if (current.passkeys.enabled && !write.passkeys.enabled) {
        await mfa().clearAllPasskeys();
      }

      if (input.mfa) {
        if (requiredRoles.length > 0) {
          await roleQuery().updateMany({
            where: { id: { $in: requiredRoles } },
            data: { mfaRequired: true },
          });
        }
        // `where: {}` would be every role in the table: an empty `requiredRoles` clears them all.
        // Only rows actually flagged are written, so a save does not bump `updatedAt` on every role
        // whose flag was already off.
        await roleQuery().updateMany({
          where:
            requiredRoles.length > 0
              ? { id: { $notIn: requiredRoles }, mfaRequired: true }
              : { mfaRequired: true },
          data: { mfaRequired: false },
        });

        await restartStaleGrace(current.mfa, write.mfa.mode, write.requiredRoles);
      }
    });

    const next = await getSettings();
    strapi.eventHub.emit('admin.security-settings.update', { previous, next });
    return next;
  };

  return { getSettings, updateSettings, listRequiredRoleIds };
};
