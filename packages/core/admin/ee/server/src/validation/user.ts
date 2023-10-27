import { yup, validateYupSchema } from '@strapi/utils';
import '@strapi/types';
import { schemas } from '../../../../server/src/validation/user';

const ssoUserCreationInputExtension = yup
  .object()
  .shape({
    useSSORegistration: yup.boolean(),
  })
  .noUnknown();

export const validateUserCreationInput = (data: any) => {
  let schema = schemas.userCreationSchema;

  if (strapi.EE.features.isEnabled('sso')) {
    schema = schema.concat(ssoUserCreationInputExtension);
  }

  return validateYupSchema(schema)(data);
};

export default {
  validateUserCreationInput,
};
