import { yup, validateYupSchema } from '@strapi/utils';

// Accepts either nothing (in which case the refresh token is obtained from the
// context cookies) or a { refreshToken } string if cookie-based flow is disabled
const schema = yup
  .object()
  .shape({
    refreshToken: yup.string().optional(),
  })
  // Allow unknown keys so legacy clients passing `{ token }`
  // don't fail schema validation in the alias route.
  // TODO: session manager is the default auth flow - there should be no legacy calls
  // being made from the admin ??
  .noUnknown(false);

export default validateYupSchema(schema);
