'use strict';

const { yup } = require('strapi-utils');
const _ = require('lodash');
const {
  checkFieldsAreCorrectlyNested,
  checkFieldsDontHaveDuplicates,
} = require('./common-functions');

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

const arrayOfConditionNames = yup
  .array()
  .of(yup.string())
  .test('is-an-array-of-conditions', 'is not a plugin name', function(value) {
    const ids = strapi.admin.services.permission.conditionProvider.getAll().map(c => c.id);
    return _.isUndefined(value) || _.difference(value, ids).length === 0
      ? true
      : this.createError({ path: this.path, message: `contains conditions that don't exist` });
  });

const updatePermissions = yup
  .object()
  .shape({
    permissions: yup
      .array()
      .requiredAllowEmpty()
      .of(
        yup
          .object()
          .shape({
            action: yup.string().required(),
            subject: yup.string().nullable(),
            fields: yup
              .array()
              .of(yup.string())
              .nullable()
              .test(
                'field-nested',
                'Fields format are incorrect (bad nesting).',
                checkFieldsAreCorrectlyNested
              )
              .test(
                'field-nested',
                'Fields format are incorrect (duplicates).',
                checkFieldsDontHaveDuplicates
              ),
            conditions: arrayOfConditionNames,
          })
          .noUnknown()
      ),
  })
  .required()
  .noUnknown();

module.exports = {
  email,
  firstname,
  lastname,
  username,
  password,
  roles,
  isAPluginName,
  arrayOfConditionNames,
  updatePermissions,
};
