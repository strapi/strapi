'use strict';

const _ = require('lodash');
const { yup, formatYupErrors } = require('strapi-utils');
const validators = require('./common-validators');
const { checkFieldsAreCorrectlyNested } = require('./common-functions');

const handleReject = error => Promise.reject(formatYupErrors(error));

// validatedUpdatePermissionsInput

const BOUND_ACTIONS = [
  'plugins::content-manager.explorer.read',
  'plugins::content-manager.explorer.create',
  'plugins::content-manager.explorer.update',
  'plugins::content-manager.explorer.delete',
];

const checkPermissionsAreBound = function(permissions) {
  const subjectMap = {};
  let areBond = true;
  permissions
    .filter(perm => BOUND_ACTIONS.includes(perm.action))
    .forEach(perm => {
      subjectMap[perm.subject] = subjectMap[perm.subject] || {};
      perm.fields.forEach(field => {
        subjectMap[perm.subject][field] = subjectMap[perm.subject][field] || new Set();
        subjectMap[perm.subject][field].add(perm.action);
      });
    });

  _.forIn(subjectMap, subject => {
    _.forIn(subject, field => {
      if (field.size !== BOUND_ACTIONS.length) {
        areBond = false;
        return false;
      }
    });
    if (!areBond) return false;
  });

  return areBond;
};

const updatePermissionsSchemaArray = [
  yup
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
              subject: yup.string(),
              fields: yup
                .array()
                .of(yup.string())
                .nullable()
                .test(
                  'field-nested',
                  'Fields format are incorrect (duplicates or bad nesting).',
                  checkFieldsAreCorrectlyNested
                ),
              conditions: validators.arrayOfConditionNames,
            })
            .noUnknown()
        ),
    })
    .required()
    .noUnknown(),
  yup.object().shape({
    permissions: yup
      .array()
      .test(
        'are-bond',
        'Read, Create, Update and Delete have to be defined all together for a subject field or not at all',
        checkPermissionsAreBound
      ),
  }),
];

const checkPermissionsSchema = yup.object().shape({
  permissions: yup.array().of(
    yup
      .object()
      .shape({
        action: yup.string().required(),
        subject: yup.string(),
        field: yup.string(),
      })
      .noUnknown()
  ),
});

const validateCheckPermissionsInput = data => {
  return checkPermissionsSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

const validatedUpdatePermissionsInput = async data => {
  try {
    for (const schema of updatePermissionsSchemaArray) {
      await schema.validate(data, { strict: true, abortEarly: false });
    }
  } catch (e) {
    return handleReject(e);
  }
};

// validatePermissionsExist

const checkPermissionsExist = function(permissions) {
  const existingActions = strapi.admin.services.permission.actionProvider.getAll();
  const failIndex = permissions.findIndex(
    permission =>
      !existingActions.some(
        ea =>
          ea.actionId === permission.action &&
          (ea.section !== 'contentTypes' ||
            (ea.subjects.includes(permission.subject) && Array.isArray(permission.fields)))
      )
  );

  return failIndex === -1
    ? true
    : this.createError({
        path: 'permissions',
        message: `[${failIndex}] is not an existing permission action`,
      });
};

const actionsExistSchema = yup
  .array()
  .of(
    yup.object().shape({
      conditions: validators.arrayOfConditionNames,
    })
  )
  .test('actions-exist', '', checkPermissionsExist);

const validatePermissionsExist = data => {
  return actionsExistSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

// exports

module.exports = {
  validatedUpdatePermissionsInput,
  validatePermissionsExist,
  validateCheckPermissionsInput,
};
