'use strict';

const { yup } = require('strapi-utils');

const strapiID = yup.lazy(value =>
  typeof value === 'number' ? yup.number().integer() : yup.string()
); // https://github.com/jquense/yup/issues/665

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

const roles = yup.array(strapiID);

module.exports = {
  email,
  firstname,
  lastname,
  username,
  password,
  roles,
  strapiID,
};
