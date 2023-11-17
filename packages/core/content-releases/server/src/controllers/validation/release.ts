import { yup, validateYupSchema } from '@strapi/utils';

const validateReleaseSchema = yup
  .object()
  .shape({
    name: yup.string().trim().required(),
  })
  .required()
  .noUnknown();

export const validateRelease = validateYupSchema(validateReleaseSchema);
