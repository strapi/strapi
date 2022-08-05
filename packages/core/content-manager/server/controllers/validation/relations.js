'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const validateFindNewSchema = yup
  .object()
  .shape({
    component: yup.string(),
    entityId: yup.strapiID(),
    q: yup.string(),
    omitIds: yup.array().of(yup.strapiID()),
    page: yup
      .number()
      .integer()
      .min(1),
    pageSize: yup
      .number()
      .integer()
      .min(1)
      .max(100),
  })
  .noUnknown()
  .required();

module.exports = {
  validateFindNew: validateYupSchema(validateFindNewSchema, { strict: false }),
};
