import { yup, validateYupSchema } from '@strapi/utils';

/**
 * `max(32)` is deliberately loose: a 6-8 digit TOTP code and a 10-character recovery code the
 * user may have typed with dashes must both pass. Which factor was actually submitted is decided
 * later, by shape, inside `admin::mfa`'s `verifyChallenge` — this schema only bounds the input.
 */
const mfaLoginSchema = yup
  .object()
  .shape({
    challengeToken: yup.string().required(),
    code: yup.string().trim().min(6).max(32).required(),
  })
  .required()
  .noUnknown();

export const validateMfaLoginInput = validateYupSchema(mfaLoginSchema);
