import { yup, validateYupSchema } from '@strapi/utils';

/**
 * `code`'s `max(32)` is loose so a TOTP code and a dash-typed recovery code both pass. No
 * `.trim()` anywhere: under `strict: true` yup's `.trim()` asserts rather than transforms, so it
 * would reject a pasted code instead of cleaning it -- the handlers trim. `deviceId`/`rememberMe`
 * mirror `/login`'s schema, or `.noUnknown()` rejects a body `issueSession` legitimately reads.
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

/** `assertion` is left to `@simplewebauthn/server`: re-declaring the WebAuthn response shape here
 * would reject fields a future revision adds. */
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

/** `code` is optional: only an already-enrolled account sends one, to replace its authenticator. */
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

/** The shared gate for /mfa/recovery-codes, /mfa/disable and /mfa/passkeys/options: a stolen
 * session alone is never enough to relax or extend the account's protection. */
const passwordAndCodeSchema = yup
  .object()
  .shape({
    password: yup.string().required(),
    code: yup.string().min(6).max(32).required(),
  })
  .required()
  .noUnknown();

/** `name` is bounded 1..50 *after* trimming, hence a `test` rather than `.max(50)`; the `.max(200)`
 * only stops the test running over something absurd. `registration` is left to the library, as
 * `assertion` is above. */
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

const noticesSeenSchema = yup
  .object()
  .shape({ ids: yup.array().of(yup.number().integer().required()).optional() })
  .required()
  .noUnknown();

export const validateMfaEnrolInput = validateYupSchema(enrolSchema);
export const validateMfaCodeInput = validateYupSchema(codeOnlySchema);
export const validateMfaPasswordAndCodeInput = validateYupSchema(passwordAndCodeSchema);
export const validateMfaNoticesSeenInput = validateYupSchema(noticesSeenSchema);
// Its own export, so the passkey route can diverge from the two TOTP ones.
export const validatePasskeyOptionsInput = validateYupSchema(passwordAndCodeSchema);
export const validateRegisterPasskeyInput = validateYupSchema(registerPasskeySchema);
