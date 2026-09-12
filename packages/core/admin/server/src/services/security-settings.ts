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

const { ValidationError } = errors;

export const SECURITY_SETTINGS_KEY = 'security-settings';

export const MFA_ENFORCEMENT_MODES: readonly MfaEnforcementMode[] = ['off', 'optional', 'required'];

export const DEFAULT_MFA_ENFORCEMENT: MfaEnforcement = { mode: 'optional', graceDays: 7 };

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
 * the default for that key, which is `optional` rather than anything that could lock a user out.
 */
export const readMfaEnforcement = async (strapi: Core.Strapi): Promise<MfaEnforcement> => {
  const stored = (await adminStore(strapi).get({ key: SECURITY_SETTINGS_KEY })) as
    | StoredSecuritySettings
    | null
    | undefined;
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
    | StoredSecuritySettings
    | null
    | undefined;
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
    | StoredSecuritySettings
    | null
    | undefined;
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

const MODE_RANK: Record<MfaEnforcementMode, number> = { off: 0, optional: 1, required: 2 };

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
  // A dropped role relaxes nothing while the *resulting* mode is `required`, where the mode alone
  // covers every local-password user.
  const removedRoles = previous.mfa.requiredRoles.filter((id) => !next.requiredRoles.includes(id));
  const lowersEnforcement =
    MODE_RANK[next.mfa.mode] < MODE_RANK[previous.mfa.mode] ||
    (next.mfa.mode !== 'required' && removedRoles.length > 0) ||
    next.mfa.graceDays > previous.mfa.graceDays;

  // Offering trust, or lengthening it, lets a browser skip the second factor for longer than before.
  const widensTrust =
    (!previous.trustedDevices.enabled && next.trustedDevices.enabled) ||
    (next.trustedDevices.enabled && next.trustedDevices.days > previous.trustedDevices.days);

  // An irreversible, organisation-wide deletion of every passkey, so a stolen session must not be
  // able to do it with one PUT and a dialog the attacker is not looking at.
  const disablesPasskeys = previous.passkeys.enabled && !next.passkeys.enabled;

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

  const getSettings = async (): Promise<SecuritySettings> => ({
    mfa: { ...(await readMfaEnforcement(strapi)), requiredRoles: await listRequiredRoleIds() },
    trustedDevices: await readTrustedDeviceSettings(strapi),
    passkeys: await readPasskeySettings(strapi),
  });

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
        throw new ValidationError('requiredRoles contains an unknown role id');
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
    // unless they are exempt from local login.
    const addedRoles = requiredRoles.filter((id) => !previous.mfa.requiredRoles.includes(id));
    const raisesToRequired = nextMfa.mode === 'required' && previous.mfa.mode !== 'required';
    const addsHeldRole = addedRoles.some((id) => actorRoleIds.has(id));
    if (!actorExempt && !actorEnrolled && (raisesToRequired || addsHeldRole)) {
      throw new ValidationError(GUARD_MESSAGE);
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
          'Your account has no local password, so it cannot lower two-factor authentication requirements. Ask an administrator who signs in with a password.'
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

    // A save that demanded nothing is only safe if it still demands nothing at write time.
    const credentialsVerified = lowersEnforcement || widensTrust || disablesPasskeys;

    await strapi.db.transaction(async () => {
      // A concurrent save since the read at the top can turn what looked like a raise into a
      // relaxation. The credential check is not repeated -- bcrypt would hold the transaction open --
      // so a save whose requirement appeared only now is refused and the caller retries.
      const current = await getSettings();
      if (relaxingChanges(current, nextValues).any && !credentialsVerified) {
        throw new ValidationError(
          'Two-factor settings changed while this save was in flight. Review the current settings and try again.'
        );
      }

      // The document is always written whole, from the resolved next values, so an absent object
      // in the body is re-written unchanged rather than dropped.
      await adminStore(strapi).set({
        key: SECURITY_SETTINGS_KEY,
        value: {
          mfa: { mode: nextMfa.mode, graceDays: nextMfa.graceDays },
          trustedDevices: { enabled: nextTrusted.enabled, days: nextTrusted.days },
          passkeys: { enabled: nextPasskeys.enabled },
        },
      });

      // Left in place, these rows would let a later re-enable silently revive trusts granted under the
      // old policy. Deleted in the same transaction as the setting that forbids them.
      if (previous.trustedDevices.enabled && !nextTrusted.enabled) {
        await mfa().clearAllTrustedDevices();
      }

      // The same cascade, for the same reason -- and why this `PUT` carries credentials.
      if (previous.passkeys.enabled && !nextPasskeys.enabled) {
        await mfa().clearAllPasskeys();
      }

      if (input.mfa) {
        if (requiredRoles.length > 0) {
          await roleQuery().updateMany({
            where: { id: { $in: requiredRoles } },
            data: { mfaRequired: true },
          });
        }
        // `where: {}` is every role in the table, not a no-op: an empty `requiredRoles` clears them all.
        await roleQuery().updateMany({
          where: requiredRoles.length > 0 ? { id: { $notIn: requiredRoles } } : {},
          data: { mfaRequired: false },
        });

        // Grace clocks kept running while enforcement was paused, so without this, resuming after more
        // than `graceDays` locks every previously graced user at their next session with no banner.
        if (previous.mfa.mode === 'off' && nextMfa.mode !== 'off') {
          await userQuery().updateMany({
            where: { mfaLockedAt: null, mfaGraceUntil: { $notNull: true } },
            data: { mfaGraceUntil: null },
          });
        }
      }
    });

    const next = await getSettings();
    strapi.eventHub.emit('admin.security-settings.update', { previous, next });
    return next;
  };

  return { getSettings, updateSettings, listRequiredRoleIds };
};
