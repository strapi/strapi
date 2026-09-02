import { yup, validateYupSchema } from '@strapi/utils';

/**
 * `max(32)` is deliberately loose: a 6-8 digit TOTP code and a 10-character recovery code the
 * user may have typed with dashes must both pass. Which factor was actually submitted is decided
 * later, by shape, inside `admin::mfa`'s `verifyChallenge` — this schema only bounds the input.
 *
 * No `.trim()` here: `validateYupSchema` runs with `strict: true`, and under strict mode yup's
 * `.trim()` stops being a transform and becomes an assertion that the value is already
 * trimmed -- it would reject, not clean up, a pasted code with surrounding whitespace. The
 * `loginMfa` handler trims `code` itself before it reaches `verifyChallenge`.
 *
 * `challengeToken` is `crypto.randomBytes(32).toString('hex')` (see `admin::mfa`), always
 * exactly 64 hex characters, so `.max(64)` bounds it without needing to know its exact shape.
 *
 * `deviceId`/`rememberMe` mirror `/login`'s own schema (`validation/authentication/login.ts`):
 * `issueSession` reads both from the request body via `extractDeviceParams`, so `/login/mfa`
 * must accept them too, or `.noUnknown()` below would reject a body that legitimately carries
 * them and silently lose the caller's "remember me" choice.
 */
const mfaLoginSchema = yup
  .object()
  .shape({
    challengeToken: yup.string().max(64).required(),
    code: yup.string().min(6).max(32).required(),
    deviceId: yup.string().uuid().optional(),
    rememberMe: yup.boolean().optional(),
  })
  .required()
  .noUnknown();

export const validateMfaLoginInput = validateYupSchema(mfaLoginSchema);

/**
 * /mfa/enrol - only a password is needed to start enrolment; nothing about the second factor
 * exists yet at this point.
 */
const enrolSchema = yup
  .object()
  .shape({ password: yup.string().required() })
  .required()
  .noUnknown();

/**
 * The `code` field here is copied verbatim from `mfaLoginSchema` above: same bounds, same
 * no-`.trim()` reasoning (a pasted code with surrounding whitespace must not be rejected by the
 * validator itself), same shape-based dispatch left entirely to the service.
 */
const codeOnlySchema = yup
  .object()
  .shape({ code: yup.string().min(6).max(32).required() })
  .required()
  .noUnknown();

/**
 * The shared re-authentication gate for /mfa/recovery-codes and /mfa/disable: both require the
 * current password on top of an existing second factor, so a stolen session alone is never
 * enough to regenerate codes or turn two-factor authentication off.
 */
const passwordAndCodeSchema = yup
  .object()
  .shape({
    password: yup.string().required(),
    code: yup.string().min(6).max(32).required(),
  })
  .required()
  .noUnknown();

/**
 * /mfa/notices/seen - `ids` is optional: absent means "every unseen notice for the caller".
 */
const noticesSeenSchema = yup
  .object()
  .shape({ ids: yup.array().of(yup.number().integer().required()).optional() })
  .required()
  .noUnknown();

export const validateMfaEnrolInput = validateYupSchema(enrolSchema);
export const validateMfaCodeInput = validateYupSchema(codeOnlySchema);
export const validateMfaPasswordAndCodeInput = validateYupSchema(passwordAndCodeSchema);
export const validateMfaNoticesSeenInput = validateYupSchema(noticesSeenSchema);
