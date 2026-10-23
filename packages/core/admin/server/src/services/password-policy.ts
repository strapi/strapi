import type { PasswordPolicy } from '../../../shared/contracts/admin';

const STORE_KEY = 'password-policy';

/**
 * bcrypt only hashes the first 72 bytes of a password, so longer ones are rejected whatever
 * the policy says. Kept here so every consumer uses the same bound.
 */
export const PASSWORD_MAX_BYTES = 72;

/** Bounds of the configurable minimum length. 8 is the NIST SP 800-63B floor. */
export const PASSWORD_MIN_LENGTH_FLOOR = 8;
export const PASSWORD_MIN_LENGTH_CEILING = 64;

/** The rules Strapi always enforced before the policy became configurable. */
export const DEFAULT_PASSWORD_POLICY: Readonly<PasswordPolicy> = Object.freeze({
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialCharacter: false,
});

const POLICY_KEYS = Object.keys(DEFAULT_PASSWORD_POLICY) as Array<keyof PasswordPolicy>;

export type PasswordPolicyRule =
  | 'minLength'
  | 'lowercase'
  | 'uppercase'
  | 'number'
  | 'specialCharacter';

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
 * Ordered like the former hard-coded yup chain so the error output stays identical for the
 * default policy. Unicode-aware: "é" is a lowercase letter and "٣" a digit, whatever the locale.
 */
const RULES: RuleDefinition[] = [
  {
    rule: 'minLength',
    isEnabled: () => true,
    isSatisfied: (password, policy) => password.length >= policy.minLength,
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
    isSatisfied: (password) => /[^\p{L}\p{N}]/u.test(password),
    message: () => 'must contain at least one special character',
  },
];

const getStore = () => strapi.store({ type: 'core', name: 'admin' });

/**
 * Only keeps the known keys whose type matches the default value, so a hand-edited or outdated
 * core_store row can never break password validation.
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

  return policy as Partial<PasswordPolicy>;
};

/**
 * The effective policy: the stored one on top of the defaults, so a policy saved by an older
 * version (missing newer rules) keeps working.
 */
const getPolicy = async (): Promise<PasswordPolicy> => {
  const stored = await getStore().get({ key: STORE_KEY });

  return { ...DEFAULT_PASSWORD_POLICY, ...sanitize(stored) };
};

const updatePolicy = async (input: Partial<PasswordPolicy>): Promise<PasswordPolicy> => {
  const policy: PasswordPolicy = { ...(await getPolicy()), ...sanitize(input) };

  await getStore().set({ key: STORE_KEY, value: policy });

  return policy;
};

/**
 * Every rule of the policy the password breaks, in display order. Empty when it complies.
 * Pure, so the admin panel and other plugins can mirror the check.
 */
const getViolations = (
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordPolicyViolation[] => {
  return RULES.filter(
    (definition) => definition.isEnabled(policy) && !definition.isSatisfied(password, policy)
  ).map((definition) => ({ rule: definition.rule, message: definition.message(policy) }));
};

const isCompliant = (password: string, policy?: PasswordPolicy): boolean =>
  getViolations(password, policy).length === 0;

export default {
  getPolicy,
  updatePolicy,
  getViolations,
  isCompliant,
};
