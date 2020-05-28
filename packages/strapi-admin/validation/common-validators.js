'use strict';

const { yup } = require('strapi-utils');

yup['strapiID'] = yup.lazy(value =>
  typeof value === 'number'
    ? yup.number().integer()
    : yup.string().matches(/^[a-f\d]{24}$/, '${path} must be a valid ID')
);

const email = yup
  .string()
  .email()
  .min(1);

const firstname = yup.string().min(1);

const lastname = yup.string().min(1);

const username = yup.string().min(1);

const password = yup
  .string()
  .min(8)
  .matches(/[a-z]/, '${path} must contain at least one lowercase character')
  .matches(/[A-Z]/, '${path} must contain at least one uppercase character')
  .matches(/\d/, '${path} must contain at least one number');

const roles = yup.array(yup.strapiID).min(1);

module.exports = {
  email,
  firstname,
  lastname,
  username,
  password,
  roles,
};
