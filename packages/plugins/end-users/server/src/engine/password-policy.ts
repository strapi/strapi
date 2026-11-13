/**
 * The one password checker. Every way a password is set goes through it: sign-up, reset, change and
 * set-password (the `password-policy` Better Auth plugin) and the Content Manager (`engine.setPassword`).
 *
 * Better Auth's own length check is set to the widest range the settings allow (8 to 256), so the
 * admin's `minLength` and `maxLength` are checked here, per request, and need no rebuild.
 */
import type { EndUsersSettings } from '../../../shared/contracts/settings';

export type PasswordPolicy = EndUsersSettings['passwords'];

/** The code of the 400 a refused password gets. */
export const PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK';

/** Mixed classes means at least this many of lower, upper, digit and symbol. */
const REQUIRED_CLASSES = 3;

const CLASSES = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{N}]/u];

/** bcrypt reads no more than this many bytes of a password */
export const BCRYPT_MAX_BYTES = 72;

/**
 * What is wrong with this password under this policy, or `null` when nothing is. `bcrypt` is on
 * while the compatibility mode hashes with bcrypt: a longer password would be cut at 72 bytes, so
 * two passwords with the same start would be one, and it is refused instead.
 */
export const passwordProblem = (
  password: string,
  policy: PasswordPolicy,
  { bcrypt = false }: { bcrypt?: boolean } = {}
): string | null => {
  if (typeof password !== 'string' || password.length < policy.minLength) {
    return `The password must be at least ${policy.minLength} characters long.`;
  }

  if (password.length > policy.maxLength) {
    return `The password must be at most ${policy.maxLength} characters long.`;
  }

  if (bcrypt && Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) {
    return `The password must be at most ${BCRYPT_MAX_BYTES} bytes long.`;
  }

  if (
    policy.requireMixedClasses &&
    CLASSES.filter((pattern) => pattern.test(password)).length < REQUIRED_CLASSES
  ) {
    return 'The password must contain at least three of: lowercase letters, uppercase letters, digits and symbols.';
  }

  return null;
};
