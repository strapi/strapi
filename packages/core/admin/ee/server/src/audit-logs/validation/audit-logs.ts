import { yup, validateYupSchema } from '@strapi/utils';

const ALLOWED_SORT_STRINGS = ['action:ASC', 'action:DESC', 'date:ASC', 'date:DESC'];

const validateFindManySchema = yup
  .object()
  .shape({
    page: yup.number().integer().min(1),
    pageSize: yup.number().integer().min(1).max(100),
    sort: yup.mixed().oneOf(ALLOWED_SORT_STRINGS),
    // Filters
    action: yup.string(),
    userId: yup.mixed().test('is-number-or-string', 'userId must be a string or number', (val) => {
      return val == null || typeof val === 'string' || typeof val === 'number';
    }),
    contentType: yup.string(),
    dateFrom: yup.date(),
    dateTo: yup.date(),
  })
  .required();

export const validateFindMany = validateYupSchema(validateFindManySchema, { strict: false });

export default {
  validateFindMany,
};
