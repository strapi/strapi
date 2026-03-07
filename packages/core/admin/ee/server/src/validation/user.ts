import { yup, validateYupSchema } from '@strapi/utils';
import { schemas } from '../../../../server/src/validation/user';

const ssoUserCreationInputExtension = yup
  .object()
  .shape({
    useSSORegistration: yup.boolean(),
  })
  .noUnknown();

export const validateUserCreationInput = (data: any) => {
  let schema = (schemas as any).userCreationSchema;

  if (strapi.ee.features.isEnabled('sso')) {
    schema = schema.concat(ssoUserCreationInputExtension);
  }

  return validateYupSchema(schema)(data);
};

type ValidatorFn = (data: any) => Promise<unknown>;
export default {
  validateUserCreationInput,
} as Record<string, ValidatorFn>;
