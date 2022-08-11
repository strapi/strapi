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
  .noUnknown()
  .required();

module.exports = {
  validateFindAvailable: validateYupSchema(validateFindAvailableSchema, { strict: false }),
};
