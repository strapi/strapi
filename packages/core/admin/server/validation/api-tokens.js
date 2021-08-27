'use strict';

const { yup, formatYupErrors } = require('@strapi/utils');

const handleReject = error => Promise.reject(formatYupErrors(error));

const apiTokenCreationSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .required(),
    description: yup.string().optional(),
    type: yup
      .string()
      .oneOf(['read-only', 'full-access'])
      .required(),
  })
  .noUnknown();

const validateApiTokenCreationInput = async data => {
  return apiTokenCreationSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validateApiTokenCreationInput,
};
