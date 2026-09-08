import { errors } from '@strapi/utils';
import type { Core, Data } from '@strapi/types';
import type {
  MfaEnforcement,
  MfaEnforcementMode,
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

/** The persisted shape. `requiredRoles` lives on `admin::role`, not here. */
export interface StoredSecuritySettings {
  mfa?: Partial<MfaEnforcement>;
  trustedDevices?: Partial<TrustedDeviceSettings>;
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

type WarnableKey = 'mode' | 'graceDays' | 'trustedDevices.enabled' | 'trustedDevices.days';

/**
 * Which stored keys have already logged their corrupt-value warning this process. Both readers
 * run on every session issue (login, registration, reset, refresh), so a persistently corrupt row
 * would otherwise warn on every single one of them -- this makes it warn once per key per process.
 */
const warnedKeys = new Set<WarnableKey>();

const warnOnce = (strapi: Core.Strapi, key: WarnableKey, message: string): void => {
  if (warnedKeys.has(key)) {
    return;
  }
  warnedKeys.add(key);
  strapi.log.warn(`[security-settings] ${message} (this warning is logged once per process).`);
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
 * Cycle 3 policy: whether a browser may be trusted after a verified code, and for how many days.
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

export const GUARD_MESSAGE = 'Enrol in two-factor authentication before requiring it for others';

const MODE_RANK: Record<MfaEnforcementMode, number> = { off: 0, optional: 1, required: 2 };

/** The slice of `admin::mfa` this service depends on, resolved lazily through the registry. */
interface MfaServiceLike {
  isExemptFromMfa(user: {
    id: Data.ID;
    password?: string | null;
    roles?: unknown;
  }): Promise<boolean>;
  isEnrolled(userId: string): Promise<boolean>;
  assertPasswordAndFactor(userId: string, password: string, code: string): Promise<void>;
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
  });

  const updateSettings = async (
    input: UpdateSecuritySettings.Request['body'],
    actor: { id: Data.ID }
  ): Promise<SecuritySettings> => {
    // Per-object, no merge inside an object: a present `mfa` or `trustedDevices` replaces its
    // object whole, an absent one is left exactly as stored. The validator already enforces the
    // shape of each; this is the one rule it cannot express.
    if (!input.mfa && !input.trustedDevices) {
      throw new ValidationError('Provide mfa or trustedDevices');
    }

    const previous = await getSettings();
    const nextMfa = input.mfa ?? previous.mfa;
    const nextTrusted = input.trustedDevices ?? previous.trustedDevices;
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

    // The self-lockout guard (spec "Guard"): the one write that sets policy may not require a
    // second factor of a caller who has none, unless the caller is exempt from local login. With
    // `mfa` absent from the body `nextMfa` is `previous.mfa`, so both conditions are false.
    const addedRoles = requiredRoles.filter((id) => !previous.mfa.requiredRoles.includes(id));
    const raisesToRequired = nextMfa.mode === 'required' && previous.mfa.mode !== 'required';
    const addsHeldRole = addedRoles.some((id) => actorRoleIds.has(id));
    if (!actorExempt && !actorEnrolled && (raisesToRequired || addsHeldRole)) {
      throw new ValidationError(GUARD_MESSAGE);
    }

    // Security downgrades need re-authentication, exactly like `/mfa/disable`: session authority
    // alone is not enough when the session may be the thing an attacker holds. Any change that
    // relaxes enforcement -- a lower mode, a dropped required role, or a longer grace period --
    // counts. A role dropped from `requiredRoles` only relaxes anything while the *resulting* mode
    // is not `required`: once every local-password user is covered by mode alone, the per-role
    // list is inert, so removing a role on the same move that raises to `required` is not a
    // downgrade.
    const removedRoles = previous.mfa.requiredRoles.filter((id) => !requiredRoles.includes(id));
    const lowersEnforcement =
      MODE_RANK[nextMfa.mode] < MODE_RANK[previous.mfa.mode] ||
      (nextMfa.mode !== 'required' && removedRoles.length > 0) ||
      nextMfa.graceDays > previous.mfa.graceDays;
    // Cycle 3: offering trust where none was offered, or promising a longer trust, both let a
    // browser skip the second factor for longer than before. Lowering `days` or disabling only
    // ever cuts trust short, so neither needs re-authentication.
    const widensTrust =
      (!previous.trustedDevices.enabled && nextTrusted.enabled) ||
      (nextTrusted.enabled && nextTrusted.days > previous.trustedDevices.days);
    if (lowersEnforcement || widensTrust) {
      // A downgrade requires re-authentication, and an account with no local password (SSO-only,
      // the same condition `isExemptFromMfa` treats as exempt) has no local credential to
      // present. Refused explicitly, before the password/code checks below: `auth.validatePassword`
      // would otherwise be asked to compare a password against a null hash.
      if (!actorRow.password) {
        throw new ValidationError(
          'Your account has no local password, so it cannot lower two-factor authentication requirements. Ask an administrator who signs in with a password.'
        );
      }
      if (!input.password) {
        throw new ValidationError(
          'Your password is required to lower two-factor authentication requirements'
        );
      }
      if (actorEnrolled) {
        if (!input.code) {
          throw new ValidationError(
            'A two-factor code is required to lower two-factor authentication requirements'
          );
        }
        await mfa().assertPasswordAndFactor(String(actorRow.id), input.password, input.code);
      } else if (!(await auth().validatePassword(input.password, actorRow.password))) {
        throw new ValidationError('Invalid credentials');
      }
    }

    await strapi.db.transaction(async () => {
      // The document is always written whole, from the resolved next values, so an absent object
      // in the body is re-written unchanged rather than dropped.
      await adminStore(strapi).set({
        key: SECURITY_SETTINGS_KEY,
        value: {
          mfa: { mode: nextMfa.mode, graceDays: nextMfa.graceDays },
          trustedDevices: { enabled: nextTrusted.enabled, days: nextTrusted.days },
        },
      });

      if (input.mfa) {
        if (requiredRoles.length > 0) {
          await roleQuery().updateMany({
            where: { id: { $in: requiredRoles } },
            data: { mfaRequired: true },
          });
        }
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
