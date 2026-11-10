import { validateYupSchema, yup } from '@strapi/utils';

const resolvedSchema = yup
  .mixed()
  .nullable()
  .test('resolved', 'resolved must be true or false', (value) => typeof value === 'boolean');

export const validateResolved = validateYupSchema(resolvedSchema, { abortEarly: true });
