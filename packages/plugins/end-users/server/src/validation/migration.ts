import { validateYupSchema, yup } from '@strapi/utils';

const resolvedSchema = yup
  .mixed()
  .nullable()
  .test('resolved', 'resolved must be true or false', function resolved(value) {
    return typeof value === 'boolean' || this.createError({ path: 'resolved' });
  });

export const validateResolved = validateYupSchema(resolvedSchema, { abortEarly: true });
