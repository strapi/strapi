'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const handleReject = (error) => Promise.reject(formatYupErrors(error));

const profileUpdateSchema = yup
  .object()
  .shape({
    username: yup.string().min(1).notNull(),
    email: yup.string().email().lowercase().notNull(),
    password: yup
      .string()
      .min(8)
      .matches(/[a-z]/, '${path} must contain at least one lowercase character')
      .matches(/[A-Z]/, '${path} must contain at least one uppercase character')
      .matches(/\d/, '${path} must contain at least one number')
      .notNull(),
  })
  // Won't let users update relations
  .noUnknown();

const validateProfileUpdateInput = (data) => {
  return profileUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validateProfileUpdateInput,
};
