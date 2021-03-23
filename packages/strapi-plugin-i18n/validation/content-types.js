'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const handleReject = error => Promise.reject(formatYupErrors(error));

const validateGetNonLocalizedAttributesSchema = yup
  .object()
  .shape({
    model: yup.string().required(),
    id: yup.strapiID().required(),
    locale: yup.string().required(),
  })
  .noUnknown()
  .required();

const validateGetNonLocalizedAttributesInput = data => {
  return validateGetNonLocalizedAttributesSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validateGetNonLocalizedAttributesInput,
};
