import * as yup from 'yup';

import { getByteSize } from './strings';
import { translatedErrors } from './translatedErrors';

import type { PasswordPolicy } from '../../../shared/contracts/admin';
import type { IntlShape } from 'react-intl';

/**
 * Mirrors `DEFAULT_PASSWORD_POLICY` of the server's `password-policy` service. Used until the
 * configured policy has been fetched, and if fetching it fails (the server validates again).
 */
const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialCharacter: false,
};

/** bcrypt only hashes the first 72 bytes; this bound is not part of the configurable policy. */
const PASSWORD_MAX_BYTES = 72;

/** Bounds of the configurable minimum length, same as on the server. */
const PASSWORD_MIN_LENGTH_FLOOR = 8;
const PASSWORD_MIN_LENGTH_CEILING = 64;

const PASSWORD_MESSAGES = {
  maxBytes: {
    id: 'components.Input.error.contain.maxBytes',
    defaultMessage: 'Password must be less than 73 bytes',
  },
  lowercase: {
    id: 'components.Input.error.contain.lowercase',
    defaultMessage: 'Password must contain at least one lowercase character',
  },
  uppercase: {
    id: 'components.Input.error.contain.uppercase',
    defaultMessage: 'Password must contain at least one uppercase character',
  },
  number: {
    id: 'components.Input.error.contain.number',
    defaultMessage: 'Password must contain at least one number',
  },
  specialCharacter: {
    id: 'components.Input.error.contain.specialCharacter',
    defaultMessage: 'Password must contain at least one special character',
  },
} as const;

/**
 * Yup rules for a password following the given policy. Returns a bare string schema so callers
 * decide whether the field is required, nullable, etc. The server's `password-policy` service
 * runs the same checks and stays the authority; empty values are left to `.required()`.
 */
const createPasswordSchema = (policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY) => {
  let schema = yup
    .string()
    .min(policy.minLength, {
      id: translatedErrors.minLength.id,
      defaultMessage: 'Password must be at least {min} characters',
      values: { min: policy.minLength },
    })
    .test(
      'max-bytes',
      PASSWORD_MESSAGES.maxBytes,
      (value) => !value || getByteSize(value) <= PASSWORD_MAX_BYTES
    );

  if (policy.requireLowercase) {
    schema = schema.test(
      'lowercase',
      PASSWORD_MESSAGES.lowercase,
      (value) => !value || /\p{Ll}/u.test(value)
    );
  }

  if (policy.requireUppercase) {
    schema = schema.test(
      'uppercase',
      PASSWORD_MESSAGES.uppercase,
      (value) => !value || /\p{Lu}/u.test(value)
    );
  }

  if (policy.requireNumber) {
    schema = schema.test(
      'number',
      PASSWORD_MESSAGES.number,
      (value) => !value || /\p{Nd}/u.test(value)
    );
  }

  if (policy.requireSpecialCharacter) {
    schema = schema.test(
      'special-character',
      PASSWORD_MESSAGES.specialCharacter,
      (value) => !value || /[^\p{L}\p{N}]/u.test(value)
    );
  }

  return schema;
};

type PasswordSchema = ReturnType<typeof createPasswordSchema>;

/**
 * The sentence shown under password inputs, e.g.
 * "Must be at least 8 characters, 1 lowercase, 1 uppercase, 1 number".
 */
const formatPasswordPolicyHint = (
  policy: PasswordPolicy,
  formatMessage: IntlShape['formatMessage']
): string =>
  formatMessage(
    {
      id: 'Auth.form.password.policyHint',
      defaultMessage:
        'Must be at least {minLength} characters{requireLowercase, select, true {, 1 lowercase} other {}}{requireUppercase, select, true {, 1 uppercase} other {}}{requireNumber, select, true {, 1 number} other {}}{requireSpecialCharacter, select, true {, 1 special character} other {}}',
    },
    {
      minLength: policy.minLength,
      requireLowercase: String(policy.requireLowercase),
      requireUppercase: String(policy.requireUppercase),
      requireNumber: String(policy.requireNumber),
      requireSpecialCharacter: String(policy.requireSpecialCharacter),
    }
  );

export {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH_FLOOR,
  PASSWORD_MIN_LENGTH_CEILING,
  createPasswordSchema,
  formatPasswordPolicyHint,
};
export type { PasswordSchema };
