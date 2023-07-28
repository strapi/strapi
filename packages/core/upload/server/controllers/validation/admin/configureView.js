'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const { ALLOWED_SORT_STRINGS } = require('../../../constants');

const configSchema = yup.object({
  pageSize: yup.number().required(),
  sort: yup.mixed().oneOf(ALLOWED_SORT_STRINGS),
});

module.exports = validateYupSchema(configSchema);
