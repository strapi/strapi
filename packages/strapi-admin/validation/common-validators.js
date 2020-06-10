'use strict';

const { yup } = require('strapi-utils');

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

const roles = yup.array(yup.strapiID()).min(1);

const isAPluginName = yup
  .string()
  .test('is-a-plugin-name', 'is not a plugin name', function(value) {
    return [undefined, 'admin', ...Object.keys(strapi.plugins)].includes(value)
      ? true
      : this.createError({ path: this.path, message: `${this.path} is not an existing plugin` });
  });

module.exports = {
  email,
  firstname,
  lastname,
  username,
  password,
  roles,
  isAPluginName,
};
