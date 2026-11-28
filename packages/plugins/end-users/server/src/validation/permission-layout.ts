import { validateYupSchema, yup } from '@strapi/utils';

const routesSubjectSchema = yup
  .mixed()
  .nullable()
  .test(
    'subject',
    'subject is one string: a content type uid or a route group id',
    function subject(value) {
      return typeof value === 'string' || this.createError({ path: 'subject' });
    }
  );

export const validateRoutesSubject = validateYupSchema(routesSubjectSchema, { abortEarly: true });
