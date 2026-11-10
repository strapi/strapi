import { validateYupSchema, yup } from '@strapi/utils';

const routesSubjectSchema = yup
  .mixed()
  .nullable()
  .test(
    'subject',
    'subject is one string: a content type uid or a route group id',
    (value) => typeof value === 'string'
  );

export const validateRoutesSubject = validateYupSchema(routesSubjectSchema, { abortEarly: true });
