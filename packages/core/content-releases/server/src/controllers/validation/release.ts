import { yup, validateYupSchema } from '@strapi/utils';

const validateCreateReleaseSchema = yup
  .object()
  .shape({
    name: yup.string().required().min(1),
  })
  .required();

export const validateCreateRelease = validateYupSchema(validateCreateReleaseSchema);
