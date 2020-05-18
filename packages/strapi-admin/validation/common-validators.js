'use strict';

const { yup } = require('strapi-utils');

const validators = {
  firstname: yup
    .string()
    .min(1)
    .required(),
  lastname: yup
    .string()
    .min(1)
    .required(),
  password: yup
    .string()
    .min(8)
    .matches(/[a-z]/, '${path} must contain at least one lowercase character')
    .matches(/[A-Z]/, '${path} must contain at least one uppercase character')
    .matches(/\d/, '${path} must contain at least one number')
    .required(),
};

module.exports = validators;
