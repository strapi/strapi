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

/** The persisted shape. `requiredRoles` lives on `admin::role`, not here. */
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
  /** `resolveWebauthnRp`'s refusal cause, logged at error level from `mfa-passkeys.ts`. */
  | 'webauthn.rp';

/**
 * Which stored keys have already logged their corrupt-value warning this process. Both readers
 * run on every session issue (login, registration, reset, refresh), so a persistently corrupt row
 * would otherwise warn on every single one of them -- this makes it warn once per key per process.
 */
const warnedKeys = new Set<WarnableKey>();

/**
 * Exported for passkeys: `resolveWebauthnRp` in `services/mfa-passkeys.ts` logs its refusal cause
 * through this same helper, so there is still exactly one deduplication surface (and
 * `resetSecuritySettingsWarnings` below still gives the tests a clean slate). `level` exists for
 * that caller: an RP misconfiguration is an operator error with an action attached, so it is
 * logged at error level, while every stored-value fallback stays a warning. `prefix` exists for
 * the same caller: an `admin.auth.mfa.webauthn` misconfiguration is a **config** fault, not a
 * database-backed security-settings one, so it logs under its own tag rather than
 * `[security-settings]`.
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

/** Test-only: clears the per-process warning dedupe so each test starts from a clean slate. */
export const resetSecuritySettingsWarnings = (): void => {
  warnedKeys.clear();
};

/**
 * The one place enforcement policy is read from storage. Read on every session issue (login,
 * registration, reset, refresh), so it must never throw on a hand-edited or corrupt row: a bad
 * value is logged -- once per key per process, see `warnedKeys` -- and replaced by the default for
 * that key, which is `optional` (nothing extra required) rather than anything that could lock a
 * user out.
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

/**
 * Trusted devices policy: whether a browser may be trusted after a verified code, and for how many days.
 * Same tolerance as `readMfaEnforcement`: read on every login, so a hand-edited or corrupt row
 * warns once and falls back per key rather than throwing. The fallback is the default
 * (`enabled: true`, 30 days) because a corrupt value is not a decision to turn the feature off.
 */
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
 * Passkeys policy: whether users may register and sign in with a passkey. Same tolerance as the
 * other two readers -- it is read on every login (`passkeyAvailable`) and on every passkey route,
 * so a hand-edited or corrupt row warns once and falls back rather than throwing. The fallback is
 * the default (`enabled: true`) because a corrupt value is not a decision to turn a security
 * feature off; it also means this reader can never manufacture the "policy off with rows still
 * present" state the verify route defends against.
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
 * Which of the three relaxing changes a save makes. A pure function of the stored document and
 * the resolved next values, and therefore cheap to evaluate twice: once outside the write
 * transaction to decide which credentials to demand, and again inside it against a re-read
 * document, because the first read is not serialised against a concurrent save.
 *
 * Without that second evaluation two saves race into a bypass. From `mode: 'off'`, a save
 * raising to `required` needs no credentials; a concurrent save to `optional` reads the same
 * `off` and so also looks like a raise, needing none either. Whichever commits second has
 * lowered the mode below what the other just set, having never been challenged for a password
 * or a code.
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
  // A role dropped from `requiredRoles` only relaxes anything while the *resulting* mode is not
  // `required`: once every local-password user is covered by mode alone the per-role list is
  // inert, so removing a role on the same move that raises to `required` is not a downgrade.
  const removedRoles = previous.mfa.requiredRoles.filter((id) => !next.requiredRoles.includes(id));
  const lowersEnforcement =
    MODE_RANK[next.mfa.mode] < MODE_RANK[previous.mfa.mode] ||
    (next.mfa.mode !== 'required' && removedRoles.length > 0) ||
    next.mfa.graceDays > previous.mfa.graceDays;

  // Offering trust where none was offered, or promising a longer one, both let a browser skip
  // the second factor for longer than before. Lowering `days` or disabling only cuts trust short.
  const widensTrust =
    (!previous.trustedDevices.enabled && next.trustedDevices.enabled) ||
    (next.trustedDevices.enabled && next.trustedDevices.days > previous.trustedDevices.days);

  // Turning passkeys off is an organisation-wide, irreversible deletion of every
  // phishing-resistant credential every administrator holds (the cascade runs in the same
  // transaction), so a stolen session must not be able to wipe them all with one PUT and a
  // dialog the attacker is not looking at. Turning them *on* needs nothing.
  const disablesPasskeys = previous.passkeys.enabled && !next.passkeys.enabled;

  return {
    lowersEnforcement,
    widensTrust,
    disablesPasskeys,
    any: lowersEnforcement || widensTrust || disablesPasskeys,
  };
};

/** The slice of `admin::mfa` this service depends on, resolved lazily through the registry. */
interface MfaServiceLike {
  isExemptFromMfa(user: {
    id: Data.ID;
    password?: string | null;
    roles?: unknown;
  }): Promise<boolean>;
  isEnrolled(userId: string): Promise<boolean>;
  assertPasswordAndFactor(userId: string, password: string, code: string): Promise<void>;
  /** Every trusted-device row, every user. Called on the transition to `enabled: false`. */
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
    // Per-object, no merge inside an object: a present `mfa`, `trustedDevices` or `passkeys`
    // replaces its object whole, an absent one is left exactly as stored. The validator already
    // enforces the shape of each; this is the one rule it cannot express.
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

    // The self-lockout guard: the one write that sets policy may not require a
    // second factor of a caller who has none, unless the caller is exempt from local login. With
    // `mfa` absent from the body `nextMfa` is `previous.mfa`, so both conditions are false.
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
      // An account with no local password (SSO-only, the same condition `isExemptFromMfa` treats
      // as exempt) has no local credential to present. Enforcement accepted that dead end for
      // *lowering enforcement*, where the caller is lowering the bar on their own account. It is
      // not acceptable for a feature toggle: in an SSO-only organisation every administrator is
      // password-less, so nobody could ever turn passkeys off. So a save whose only triggering
      // term is `disablesPasskeys` proceeds on session authority; combined with either of the
      // others it is refused.
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

    // Whether the caller actually presented and passed a credential check above. A save that
    // demanded nothing is only safe if it still demands nothing against the document as it
    // stands at write time.
    const credentialsVerified = lowersEnforcement || widensTrust || disablesPasskeys;

    await strapi.db.transaction(async () => {
      // Re-evaluate against the document as it is *now*, not as it was when this request started.
      // Between the read at the top and this write, a concurrent save may have raised protection,
      // which can turn a change that looked like a raise into a relaxation. The credential check
      // is deliberately not repeated here -- bcrypt inside an open transaction would hold it for
      // the duration -- so a save whose requirement appeared only after a concurrent commit is
      // refused and the caller retries against the new state.
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

      // Turning trusted devices off means "no browser may bypass the code". Leaving rows in place
      // would let a later re-enable silently revive trusts granted under the old policy, so the
      // transition deletes them, in the same transaction as the setting that forbids them.
      if (previous.trustedDevices.enabled && !nextTrusted.enabled) {
        await mfa().clearAllTrustedDevices();
      }

      // Turning passkeys off means "no user may sign in with one". Leaving rows in place would
      // let a later re-enable silently revive credentials registered under the old policy, so the
      // transition deletes them, in the same transaction as the setting that forbids them --
      // exactly what the trusted-device cascade above does, and the reason the `PUT` that does
      // this carries credentials like a downgrade.
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
        // `where: {}` is every role in the table, not a no-op: an empty `requiredRoles` means
        // "no role requires MFA", so every row is cleared. Deliberate, and the reason this runs
        // inside the transaction with the set above rather than beside it.
        await roleQuery().updateMany({
          where: requiredRoles.length > 0 ? { id: { $notIn: requiredRoles } } : {},
          data: { mfaRequired: false },
        });

        // Grace clocks kept running while enforcement was paused. Without this, resuming after
        // more than `graceDays` would lock every previously graced user at their next session with
        // no banner in between. Locked users stay locked: nobody has decided anything about them
        // yet.
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
