'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const ALLOWED_SORT_STRINGS = ['action:ASC', 'action:DESC', 'date:ASC', 'date:DESC'];

const validateFindManySchema = yup
  .object()
  .shape({
    page: yup.number().integer().min(1),
    pageSize: yup.number().integer().min(1).max(100),
    sort: yup.mixed().oneOf(ALLOWED_SORT_STRINGS),
  })
  .required();

module.exports = {
  validateFindMany: validateYupSchema(validateFindManySchema, { strict: false }),
};
