'use strict';
const yup = require('yup');

const schema = yup
  .object()
  .shape({
    bulkable: yup.boolean().required(),
    filterable: yup.boolean().required(),
    pageSize: yup
      .number()
      .integer()
      .min(10)
      .max(100)
      .required(),
    searchable: yup.boolean().required(),
  })
  .noUnknown();

module.exports = schema;
