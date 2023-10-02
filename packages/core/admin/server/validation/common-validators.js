'use strict';

const { yup } = require('@strapi/utils');
const _ = require('lodash');
const { isEmpty, has, isNil, isArray } = require('lodash/fp');
const { getService } = require('../utils');
const actionDomain = require('../domain/action');
const {
  checkFieldsAreCorrectlyNested,
  checkFieldsDontHaveDuplicates,
} = require('./common-functions');

const getActionFromProvider = (actionId) => {
  return getService('permission').actionProvider.get(actionId);
};

const email = yup.string().email().lowercase();

const firstname = yup.string().trim().min(1);

const lastname = yup.string();

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
  .test('is-a-plugin-name', 'is not a plugin name', function (value) {
    return [undefined, 'admin', ...Object.keys(strapi.plugins)].includes(value)
      ? true
      : this.createError({ path: this.path, message: `${this.path} is not an existing plugin` });
  });

const arrayOfConditionNames = yup
  .array()
  .of(yup.string())
  .test('is-an-array-of-conditions', 'is not a plugin name', function (value) {
    const ids = strapi.admin.services.permission.conditionProvider.keys();
    return _.isUndefined(value) || _.difference(value, ids).length === 0
      ? true
      : this.createError({ path: this.path, message: `contains conditions that don't exist` });
  });

const permissionsAreEquals = (a, b) =>
  a.action === b.action && (a.subject === b.subject || (_.isNil(a.subject) && _.isNil(b.subject)));

const checkNoDuplicatedPermissions = (permissions) =>
  !Array.isArray(permissions) ||
  permissions.every((permA, i) =>
    permissions.slice(i + 1).every((permB) => !permissionsAreEquals(permA, permB))
  );

const checkNilFields = (action) =>
  function (fields) {
    // If the parent has no action field, then we ignore this test
    if (isNil(action)) {
      return true;
    }

    return actionDomain.appliesToProperty('fields', action) || isNil(fields);
  };

const fieldsPropertyValidation = (action) =>
  yup
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
    )
    .test(
      'fields-restriction',
      'The permission at ${path} must have fields set to null or undefined',
      checkNilFields(action)
    );

const permission = yup
  .object()
  .shape({
    action: yup
      .string()
      .required()
      .test('action-validity', 'action is not an existing permission action', function (actionId) {
        // If the action field is Nil, ignore the test and let the required check handle the error
        if (isNil(actionId)) {
          return true;
        }

        return !!getActionFromProvider(actionId);
      }),
    actionParameters: yup.object().nullable(),
    subject: yup
      .string()
      .nullable()
      .test('subject-validity', 'Invalid subject submitted', function (subject) {
        const action = getActionFromProvider(this.options.parent.action);

        if (!action) {
          return true;
        }

        if (isNil(action.subjects)) {
          return isNil(subject);
        }

        if (isArray(action.subjects)) {
          return action.subjects.includes(subject);
        }

        return false;
      }),
    properties: yup
      .object()
      .test('properties-structure', 'Invalid property set at ${path}', function (properties) {
        const action = getActionFromProvider(this.options.parent.action);
        const hasNoProperties = isEmpty(properties) || isNil(properties);

        if (!has('options.applyToProperties', action)) {
          return hasNoProperties;
        }

        if (hasNoProperties) {
          return true;
        }

        const { applyToProperties } = action.options;

        if (!isArray(applyToProperties)) {
          return false;
        }

        return Object.keys(properties).every((property) => applyToProperties.includes(property));
      })
      .test(
        'fields-property',
        'Invalid fields property at ${path}',
        async function (properties = {}) {
          const action = getActionFromProvider(this.options.parent.action);

          if (!action || !properties) {
            return true;
          }

          if (!actionDomain.appliesToProperty('fields', action)) {
            return true;
          }

          try {
            await fieldsPropertyValidation(action).validate(properties.fields, {
              strict: true,
              abortEarly: false,
            });
            return true;
          } catch (e) {
            // Propagate fieldsPropertyValidation error with updated path
            throw this.createError({
              message: e.message,
              path: `${this.path}.fields`,
            });
          }
        }
      ),
    conditions: yup.array().of(yup.string()),
  })
  .noUnknown();

const updatePermissions = yup
  .object()
  .shape({
    permissions: yup
      .array()
      .required()
      .of(permission)
      .test(
        'duplicated-permissions',
        'Some permissions are duplicated (same action and subject)',
        checkNoDuplicatedPermissions
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
  permission,
  updatePermissions,
};
