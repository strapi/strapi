import { yup, validateYupSchema } from '@strapi/utils';

/**
 * Three conventions every schema in this file follows.
 *
 * `code`'s `max(32)` is deliberately loose: a 6-8 digit TOTP code and a 10-character recovery
 * code the user may have typed with dashes must both pass. Which factor was submitted is decided
 * later, by shape, inside `admin::mfa`'s `verifyChallenge`.
 *
 * No `.trim()` anywhere: `validateYupSchema` runs with `strict: true`, and under strict mode
 * yup's `.trim()` stops being a transform and becomes an assertion that the value is already
 * trimmed -- it would reject, not clean up, a pasted code with surrounding whitespace. The
 * handlers trim before the value reaches the service.
 *
 * `deviceId`/`rememberMe` mirror `/login`'s own schema (`validation/authentication/login.ts`):
 * `issueSession` reads both from the request body via `extractDeviceParams`, so the login
 * schemas must accept them too, or `.noUnknown()` would reject a body that legitimately carries
 * them and silently lose the caller's "remember me" choice.
 */
const mfaLoginSchema = yup
  .object()
  .shape({
    challengeToken: yup.string().max(64).required(),
    code: yup.string().min(6).max(32).required(),
    deviceId: yup.string().uuid().optional(),
    rememberMe: yup.boolean().optional(),
    trustDevice: yup.boolean().optional(),
  })
  .required()
  .noUnknown();

export const validateMfaLoginInput = validateYupSchema(mfaLoginSchema);

const mfaWebauthnOptionsSchema = yup
  .object()
  .shape({
    challengeToken: yup.string().max(64).required(),
  })
  .required()
  .noUnknown();

/**
 * `assertion` is handed to `@simplewebauthn/server` otherwise unvalidated: the library does its
 * own structural checks, and re-declaring the WebAuthn response shape in yup would reject fields a
 * future revision adds. `registerPasskeySchema` leaves `registration` alone for the same reason.
 */
const mfaWebauthnLoginSchema = yup
  .object()
  .shape({
    challengeToken: yup.string().max(64).required(),
    assertion: yup.object().required(),
    trustDevice: yup.boolean().optional(),
    deviceId: yup.string().uuid().optional(),
    rememberMe: yup.boolean().optional(),
  })
  .required()
  .noUnknown();

export const validateMfaWebauthnOptionsInput = validateYupSchema(mfaWebauthnOptionsSchema);
export const validateMfaWebauthnLoginInput = validateYupSchema(mfaWebauthnLoginSchema);

/**
 * /mfa/enrol - a password starts a fresh enrolment; an already-enrolled account must also send
 * `code` to replace its authenticator, which is why `code` is optional here.
 */
const enrolSchema = yup
  .object()
  .shape({ password: yup.string().required(), code: yup.string().min(6).max(32).optional() })
  .required()
  .noUnknown();

const codeOnlySchema = yup
  .object()
  .shape({ code: yup.string().min(6).max(32).required() })
  .required()
  .noUnknown();

/**
 * The shared re-authentication gate for /mfa/recovery-codes, /mfa/disable and
 * /mfa/passkeys/options: each requires the current password on top of an existing second factor,
 * so a stolen session alone is never enough to relax or extend the account's protection.
 */
const passwordAndCodeSchema = yup
  .object()
  .shape({
    password: yup.string().required(),
    code: yup.string().min(6).max(32).required(),
  })
  .required()
  .noUnknown();

const passkeyOptionsSchema = yup
  .object()
  .shape({
    password: yup.string().required(),
    code: yup.string().min(6).max(32).required(),
  })
  .required()
  .noUnknown();

/**
 * `name` is the user's own label, 1..50 characters *after* trimming, so the bound is a `test`
 * rather than `.max(50)`; `.max(200)` is a cheap outer bound so the test never runs over
 * something absurd.
 *
 * `registration` is passed to `@simplewebauthn/server` otherwise unvalidated: the library does
 * its own structural checks, and re-declaring the WebAuthn response shape in yup would reject
 * fields a future revision adds.
 */
const registerPasskeySchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .required()
      .max(200)
      .test('trimmed-length', 'name must be 1 to 50 characters', (value) => {
        const trimmed = (value ?? '').trim();
        return trimmed.length >= 1 && trimmed.length <= 50;
      }),
    registration: yup.object().required(),
  })
  .required()
  .noUnknown();

/** `ids` absent means "every unseen notice for the caller". */
const noticesSeenSchema = yup
  .object()
  .shape({ ids: yup.array().of(yup.number().integer().required()).optional() })
  .required()
  .noUnknown();

export const validateMfaEnrolInput = validateYupSchema(enrolSchema);
export const validateMfaCodeInput = validateYupSchema(codeOnlySchema);
export const validateMfaPasswordAndCodeInput = validateYupSchema(passwordAndCodeSchema);
export const validateMfaNoticesSeenInput = validateYupSchema(noticesSeenSchema);
export const validatePasskeyOptionsInput = validateYupSchema(passkeyOptionsSchema);
export const validateRegisterPasskeyInput = validateYupSchema(registerPasskeySchema);
