import type { Core } from '@strapi/types';
import type {
  MfaEnforcement,
  MfaEnforcementMode,
} from '../../../shared/contracts/security-settings';

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

/**
 * The one place enforcement policy is read from storage. Read on every session issue (login,
 * registration, reset, refresh), so it must never throw on a hand-edited or corrupt row: a bad
 * value is logged and replaced by the default for that key, which is `optional` (nothing extra
 * required) rather than anything that could lock a user out.
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
    strapi.log.warn(
      `[security-settings] stored mfa.mode is not one of ${MFA_ENFORCEMENT_MODES.join(', ')}; using "${mode}".`
    );
  }
  if (mfa.graceDays !== undefined && !isGraceDays(mfa.graceDays)) {
    strapi.log.warn(
      `[security-settings] stored mfa.graceDays is not an integer in ${MIN_GRACE_DAYS}..${MAX_GRACE_DAYS}; using ${graceDays}.`
    );
  }

  return { mode, graceDays };
};
