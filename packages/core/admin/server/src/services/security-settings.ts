import { errors } from '@strapi/utils';
import type { Core, Data } from '@strapi/types';
import type {
  MfaEnforcement,
  MfaEnforcementMode,
  SecuritySettings,
  UpdateSecuritySettings,
} from '../../../shared/contracts/security-settings';

const { ValidationError } = errors;

export const SECURITY_SETTINGS_KEY = 'security-settings';

export const MFA_ENFORCEMENT_MODES: readonly MfaEnforcementMode[] = ['off', 'optional', 'required'];

export const DEFAULT_MFA_ENFORCEMENT: MfaEnforcement = { mode: 'optional', graceDays: 7 };

export const MIN_GRACE_DAYS = 1;
export const MAX_GRACE_DAYS = 30;

/** The persisted shape. `requiredRoles` lives on `admin::role`, not here. */
export interface StoredSecuritySettings {
  mfa?: Partial<MfaEnforcement>;
}

const isMode = (value: unknown): value is MfaEnforcementMode =>
  typeof value === 'string' && (MFA_ENFORCEMENT_MODES as readonly string[]).includes(value);

const isGraceDays = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_GRACE_DAYS &&
  value <= MAX_GRACE_DAYS;

const adminStore = (strapi: Core.Strapi) => strapi.store({ type: 'core', name: 'admin' });

type WarnableKey = 'mode' | 'graceDays';

/**
 * Which of `mode`/`graceDays` has already logged its corrupt-value warning this process.
 * `readMfaEnforcement` runs on every session issue (login, registration, reset, refresh), so a
 * persistently corrupt row would otherwise warn on every single one of them -- this makes it warn
 * once per key per process instead.
 */
const warnedKeys = new Set<WarnableKey>();

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

  if (mfa.mode !== undefined && !isMode(mfa.mode) && !warnedKeys.has('mode')) {
    warnedKeys.add('mode');
    strapi.log.warn(
      `[security-settings] stored mfa.mode is not one of ${MFA_ENFORCEMENT_MODES.join(', ')}; using "${mode}" (this warning is logged once per process).`
    );
  }
  if (mfa.graceDays !== undefined && !isGraceDays(mfa.graceDays) && !warnedKeys.has('graceDays')) {
    warnedKeys.add('graceDays');
    strapi.log.warn(
      `[security-settings] stored mfa.graceDays is not an integer in ${MIN_GRACE_DAYS}..${MAX_GRACE_DAYS}; using ${graceDays} (this warning is logged once per process).`
    );
  }

  return { mode, graceDays };
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
  });

  const updateSettings = async (
    input: UpdateSecuritySettings.Request['body'],
    actor: { id: Data.ID }
  ): Promise<SecuritySettings> => {
    const previous = await getSettings();
    const requiredRoles = Array.from(new Set(input.mfa.requiredRoles.map(String)));

    if (requiredRoles.length > 0) {
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
    // second factor of a caller who has none, unless the caller is exempt from local login.
    const addedRoles = requiredRoles.filter((id) => !previous.mfa.requiredRoles.includes(id));
    const raisesToRequired = input.mfa.mode === 'required' && previous.mfa.mode !== 'required';
    const addsHeldRole = addedRoles.some((id) => actorRoleIds.has(id));
    if (!actorExempt && !actorEnrolled && (raisesToRequired || addsHeldRole)) {
      throw new ValidationError(GUARD_MESSAGE);
    }

    // Security downgrades need re-authentication, exactly like `/mfa/disable`: session authority
    // alone is not enough when the session may be the thing an attacker holds. A role dropped
    // from `requiredRoles` only relaxes anything while the *resulting* mode is not `required`:
    // once every local-password user is covered by mode alone, the per-role list is inert, so
    // removing a role on the same move that raises to `required` is not a downgrade.
    const removedRoles = previous.mfa.requiredRoles.filter((id) => !requiredRoles.includes(id));
    const isDowngrade =
      MODE_RANK[input.mfa.mode] < MODE_RANK[previous.mfa.mode] ||
      (input.mfa.mode !== 'required' && removedRoles.length > 0);
    if (isDowngrade) {
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
      await adminStore(strapi).set({
        key: SECURITY_SETTINGS_KEY,
        value: { mfa: { mode: input.mfa.mode, graceDays: input.mfa.graceDays } },
      });

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

      // Grace clocks kept running while enforcement was paused. Without this, resuming after more
      // than `graceDays` would lock every previously graced user at their next session with no
      // banner in between. Locked users stay locked: nobody has decided anything about them yet.
      if (previous.mfa.mode === 'off' && input.mfa.mode !== 'off') {
        await userQuery().updateMany({
          where: { mfaLockedAt: null, mfaGraceUntil: { $notNull: true } },
          data: { mfaGraceUntil: null },
        });
      }
    });

    const next = await getSettings();
    strapi.eventHub.emit('admin.security-settings.update', { previous, next });
    return next;
  };

  return { getSettings, updateSettings, listRequiredRoleIds };
};
