'use strict';

const { yup } = require('strapi-utils');

const validators = {
  email: yup
    .string()
    .email()
    .min(1),
  firstname: yup.string().min(1),
  lastname: yup.string().min(1),
  password: yup
    .string()
    .min(8)
    .matches(/[a-z]/, '${path} must contain at least one lowercase character')
    .matches(/[A-Z]/, '${path} must contain at least one uppercase character')
    .matches(/\d/, '${path} must contain at least one number'),
  intergerOrString: yup.lazy(value =>
    typeof value === 'number' ? yup.number().integer() : yup.string()
  ), // https://github.com/jquense/yup/issues/665
};

module.exports = validators;
