import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import type { PasswordPolicy } from '../../../shared/contracts/admin';

const { ValidationError } = errors;

const STORE_KEY = 'password-policy';

/**
 * bcrypt only hashes the first 72 bytes of a password, so longer ones are rejected whatever
 * the policy says. Kept here so every consumer uses the same bound.
 */
export const PASSWORD_MAX_BYTES = 72;

/** Bounds of the configurable minimum length. 8 is the NIST SP 800-63B floor. */
export const PASSWORD_MIN_LENGTH_FLOOR = 8;
export const PASSWORD_MIN_LENGTH_CEILING = 64;

/**
 * The rules Strapi always enforced before the policy became configurable. The character classes
 * are Unicode-aware now (`\p{Ll}`, `\p{Lu}`, `\p{Nd}` instead of `[a-z]`, `[A-Z]`, `\d`), so the
 * default policy also accepts passwords such as `Пароль123` that used to be rejected.
 */
export const DEFAULT_PASSWORD_POLICY: Readonly<PasswordPolicy> = Object.freeze({
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialCharacter: false,
});

const POLICY_KEYS = Object.keys(DEFAULT_PASSWORD_POLICY) as Array<keyof PasswordPolicy>;

export type PasswordPolicyRule =
  'maxBytes' | 'minLength' | 'lowercase' | 'uppercase' | 'number' | 'specialCharacter';

export interface PasswordPolicyViolation {
  rule: PasswordPolicyRule;
  /** Human readable reason, without a subject, e.g. "must be at least 8 characters". */
  message: string;
}

interface RuleDefinition {
  rule: PasswordPolicyRule;
  isEnabled: (policy: PasswordPolicy) => boolean;
  isSatisfied: (password: string, policy: PasswordPolicy) => boolean;
  message: (policy: PasswordPolicy) => string;
}

/**
 * Counts characters as Unicode code points, so a character outside the Basic Multilingual Plane
 * (e.g. `𝐀`) counts once, where `String.length` counts its two UTF-16 code units.
 */
const countCharacters = (password: string) => Array.from(password).length;

/**
 * Ordered like the former hard-coded yup chain so the error output stays identical for the
 * default policy. Unicode-aware: "é" is a lowercase letter and "٣" a digit, whatever the locale.
 */
const RULES: RuleDefinition[] = [
  {
    rule: 'maxBytes',
    isEnabled: () => true,
    isSatisfied: (password) => new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES,
    message: () => `must be less than ${PASSWORD_MAX_BYTES + 1} bytes`,
  },
  {
    rule: 'minLength',
    isEnabled: () => true,
    isSatisfied: (password, policy) => countCharacters(password) >= policy.minLength,
    message: (policy) => `must be at least ${policy.minLength} characters`,
  },
  {
    rule: 'lowercase',
    isEnabled: (policy) => policy.requireLowercase,
    isSatisfied: (password) => /\p{Ll}/u.test(password),
    message: () => 'must contain at least one lowercase character',
  },
  {
    rule: 'uppercase',
    isEnabled: (policy) => policy.requireUppercase,
    isSatisfied: (password) => /\p{Lu}/u.test(password),
    message: () => 'must contain at least one uppercase character',
  },
  {
    rule: 'number',
    isEnabled: (policy) => policy.requireNumber,
    isSatisfied: (password) => /\p{Nd}/u.test(password),
    message: () => 'must contain at least one number',
  },
  {
    rule: 'specialCharacter',
    isEnabled: (policy) => policy.requireSpecialCharacter,
    // Anything but a letter or a decimal digit, so "²" or "½" count as special characters
    isSatisfied: (password) => /[^\p{L}\p{Nd}]/u.test(password),
    message: () => 'must contain at least one special character',
  },
];

const isValidMinLength = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= PASSWORD_MIN_LENGTH_FLOOR &&
  (value as number) <= PASSWORD_MIN_LENGTH_CEILING;

/**
 * Only keeps the known keys whose type matches the default value, so a hand-edited or outdated
 * core_store row can never break password validation. A stored `minLength` outside the bounds
 * (imported, transferred or edited by hand) is clamped to them, so it can neither weaken the
 * policy below the floor nor lock every admin out above the bcrypt limit.
 */
const sanitize = (input: unknown): Partial<PasswordPolicy> => {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const candidate = input as Record<string, unknown>;
  const policy: Record<string, unknown> = {};

  for (const key of POLICY_KEYS) {
    if (typeof candidate[key] === typeof DEFAULT_PASSWORD_POLICY[key]) {
      policy[key] = candidate[key];
    }
  }

  if (typeof policy.minLength === 'number') {
    if (Number.isFinite(policy.minLength)) {
      policy.minLength = Math.min(
        PASSWORD_MIN_LENGTH_CEILING,
        Math.max(PASSWORD_MIN_LENGTH_FLOOR, Math.ceil(policy.minLength))
      );
    } else {
      delete policy.minLength;
    }
  }

  return policy as Partial<PasswordPolicy>;
};

/**
 * Reads the floor set in `config/admin` (`passwordPolicy`). Rules it leaves out keep the default
 * policy, so without any configuration the floor is the rules Strapi always enforced. Throws on an
 * invalid value: a typo must not silently weaken every password.
 */
const parseFloor = (config: unknown): PasswordPolicy => {
  if (config === undefined || config === null) {
    return { ...DEFAULT_PASSWORD_POLICY };
  }

  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('admin.passwordPolicy must be an object');
  }

  const candidate = config as Record<string, unknown>;
  const unknownKeys = Object.keys(candidate).filter(
    (key) => !POLICY_KEYS.includes(key as keyof PasswordPolicy)
  );

  if (unknownKeys.length > 0) {
    throw new Error(
      `admin.passwordPolicy has unknown keys: ${unknownKeys.join(', ')}. Allowed: ${POLICY_KEYS.join(', ')}`
    );
  }

  if (candidate.minLength !== undefined && !isValidMinLength(candidate.minLength)) {
    throw new Error(
      `admin.passwordPolicy.minLength must be an integer between ${PASSWORD_MIN_LENGTH_FLOOR} and ${PASSWORD_MIN_LENGTH_CEILING}`
    );
  }

  for (const key of POLICY_KEYS) {
    if (
      key !== 'minLength' &&
      candidate[key] !== undefined &&
      typeof candidate[key] !== 'boolean'
    ) {
      throw new Error(`admin.passwordPolicy.${key} must be a boolean`);
    }
  }

  return { ...DEFAULT_PASSWORD_POLICY, ...(candidate as Partial<PasswordPolicy>) };
};

/** How the rules read in error messages. */
const RULE_NAMES: Record<Exclude<keyof PasswordPolicy, 'minLength'>, string> = {
  requireLowercase: 'a lowercase letter',
  requireUppercase: 'an uppercase letter',
  requireNumber: 'a number',
  requireSpecialCharacter: 'a special character',
};

/**
 * The part of a policy the floor does not already impose: rules the floor requires are stored as
 * off and a minimum length at or below the floor as the lowest bound, so they follow the floor.
 */
const aboveFloor = (policy: PasswordPolicy, floor: PasswordPolicy): PasswordPolicy => ({
  minLength: policy.minLength > floor.minLength ? policy.minLength : PASSWORD_MIN_LENGTH_FLOOR,
  requireLowercase: policy.requireLowercase && !floor.requireLowercase,
  requireUppercase: policy.requireUppercase && !floor.requireUppercase,
  requireNumber: policy.requireNumber && !floor.requireNumber,
  requireSpecialCharacter: policy.requireSpecialCharacter && !floor.requireSpecialCharacter,
});

/** The stricter of the two policies, rule by rule. */
const applyFloor = (policy: PasswordPolicy, floor: PasswordPolicy): PasswordPolicy => ({
  minLength: Math.max(policy.minLength, floor.minLength),
  requireLowercase: policy.requireLowercase || floor.requireLowercase,
  requireUppercase: policy.requireUppercase || floor.requireUppercase,
  requireNumber: policy.requireNumber || floor.requireNumber,
  requireSpecialCharacter: policy.requireSpecialCharacter || floor.requireSpecialCharacter,
});

/**
 * Every rule of the given policy the password breaks, in display order, including the bcrypt
 * byte limit. Empty when it complies. Pure: pass the result of `getPolicy()` to check against
 * the configured policy.
 */
const getViolations = (password: string, policy: PasswordPolicy): PasswordPolicyViolation[] => {
  return RULES.filter(
    (definition) => definition.isEnabled(policy) && !definition.isSatisfied(password, policy)
  ).map((definition) => ({ rule: definition.rule, message: definition.message(policy) }));
};

const isCompliant = (password: string, policy: PasswordPolicy): boolean =>
  getViolations(password, policy).length === 0;

const passwordPolicyService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () => strapi.store({ type: 'core', name: 'admin' });

  /**
   * The minimum policy set in `config/admin`, which the stored policy can only make stricter.
   */
  const getFloor = (): PasswordPolicy => parseFloor(strapi.config.get('admin.passwordPolicy'));

  /**
   * The effective policy: the stored one on top of the floor, so a policy saved by an older
   * version (missing newer rules) keeps working, then raised to the floor rule by rule. A stored
   * policy below the floor (saved before the floor was raised, or brought by a data transfer)
   * can never weaken it.
   */
  const getPolicy = async (): Promise<PasswordPolicy> => {
    const floor = getFloor();
    const stored = await getStore().get({ key: STORE_KEY });

    return applyFloor({ ...floor, ...sanitize(stored) }, floor);
  };

  /**
   * Stores the given rules on top of the current policy. Throws a `ValidationError` for a
   * `minLength` outside the bounds, whoever the caller is (the HTTP route validates it too).
   */
  const updatePolicy = async (input: Partial<PasswordPolicy>): Promise<PasswordPolicy> => {
    if (input?.minLength !== undefined && !isValidMinLength(input.minLength)) {
      throw new ValidationError(
        `minLength must be an integer between ${PASSWORD_MIN_LENGTH_FLOOR} and ${PASSWORD_MIN_LENGTH_CEILING}`
      );
    }

    const floor = getFloor();

    if (input?.minLength !== undefined && input.minLength < floor.minLength) {
      throw new ValidationError(
        `minLength must be at least ${floor.minLength}, the minimum set in the server configuration`
      );
    }

    const loosened = (Object.keys(RULE_NAMES) as Array<keyof typeof RULE_NAMES>).filter(
      (key) => floor[key] && input?.[key] === false
    );

    if (loosened.length > 0) {
      const names = loosened.map((key) => RULE_NAMES[key]);
      const list =
        names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];

      throw new ValidationError(
        `The server configuration requires ${list}: ${loosened.length > 1 ? 'these rules' : 'this rule'} cannot be turned off`
      );
    }

    const policy = applyFloor({ ...(await getPolicy()), ...sanitize(input) }, floor);

    // Only what goes beyond the floor is stored. A rule stored because the floor forced it would
    // outlive the floor: lowering `config/admin` must loosen the policy without another save.
    await getStore().set({ key: STORE_KEY, value: aboveFloor(policy, floor) });

    return policy;
  };

  return {
    getFloor,
    getPolicy,
    updatePolicy,
    getViolations,
    isCompliant,
  };
};

export default passwordPolicyService;
