import { yup, validateYupSchema } from '@strapi/utils';

const ALLOWED_SORT_STRINGS = ['action:ASC', 'action:DESC', 'date:ASC', 'date:DESC'];

const validateFindManySchema = yup
  .object()
  .shape({
    page: yup.number().integer().min(1),
    pageSize: yup.number().integer().min(1).max(100),
    sort: yup.mixed().oneOf(ALLOWED_SORT_STRINGS),
  })
  .required();

const validateFindManyUsersSchema = yup
  .object()
  .shape({
    page: yup.number().integer().min(1),
    pageSize: yup.number().integer().min(1).max(100),
  })
  .required();

export const validateFindMany = validateYupSchema(validateFindManySchema, { strict: false });
export const validateFindManyUsers = validateYupSchema(validateFindManyUsersSchema, {
  strict: false,
});

export default {
  validateFindMany,
  validateFindManyUsers,
};
