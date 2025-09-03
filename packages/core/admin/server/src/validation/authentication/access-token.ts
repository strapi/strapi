import { yup, validateYupSchema } from '@strapi/utils';

// Accepts either nothing (in which case the refresh token is obtained from the
// context cookies) or a { refreshToken } string if cookie-based flow is disabled
const schema = yup
  .object()
  .shape({
    refreshToken: yup.string().optional(),
  })
  .noUnknown();

export default validateYupSchema(schema);
