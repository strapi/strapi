'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const validateFindAvailableSchema = yup
  .object()
  .shape({
    component: yup.string(),
    entityId: yup.strapiID(),
    _q: yup.string(),
    idsToOmit: yup.array().of(yup.strapiID()),
    page: yup.number().integer().min(1),
    pageSize: yup.number().integer().min(1).max(100),
  })
  .required();

const validateFindExistingSchema = yup
  .object()
  .shape({
    component: yup.string(),
    _q: yup.string(),
    idsToOmit: yup.array().of(yup.strapiID()),
    page: yup.number().integer().min(1),
    pageSize: yup.number().integer().min(1).max(100),
  })
  .required();

module.exports = {
  validateFindAvailable: validateYupSchema(validateFindAvailableSchema, { strict: false }),
  validateFindExisting: validateYupSchema(validateFindExistingSchema, { strict: false }),
};
