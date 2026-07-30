import { yup, validateYupSchema } from '@strapi/utils';

/**
 * Validates optional session-related fields for login requests.
 * Does not constrain credential fields (email/password) handled by passport.
 */
const schema = yup
  .object()
  .shape({
    deviceId: yup.string().uuid().optional(),
    rememberMe: yup.boolean().optional(),
  })
  // Allow other properties (like email/password) to be present
  .noUnknown(false);

export default validateYupSchema(schema);
