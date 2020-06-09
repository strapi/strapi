'use strict';

const _ = require('lodash');
const { yup, formatYupErrors } = require('strapi-utils');

const handleReject = error => Promise.reject(formatYupErrors(error));

// --- validatedUpdatePermissionsInput

const BONDED_ACTIONS = [
  'plugins::content-manager.read',
  'plugins::content-manager.create',
  'plugins::content-manager.update',
  'plugins::content-manager.delete',
];

const checkPermissionsAreBond = permissions => {
  if (!Array.isArray(permissions)) {
    return false;
  }
  const subjectMap = {};
  let areBond = true;
  permissions
    .filter(perm => BONDED_ACTIONS.includes(perm.action))
    .forEach(perm => {
      subjectMap[perm.subject] = subjectMap[perm.subject] || {};
      perm.fields.forEach(field => {
        subjectMap[perm.subject][field] = subjectMap[perm.subject][field] || new Set();
        subjectMap[perm.subject][field].add(perm.action);
      });
    });

  _.forIn(subjectMap, subject => {
    _.forIn(subject, field => {
      if (field.size !== BONDED_ACTIONS.length) {
        areBond = false;
        return false;
      }
    });
    if (!areBond) return false;
  });

  return areBond;
};

const updatePermissionsSchema = yup
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
            fields: yup.array().of(yup.string()),
            conditions: yup.array().of(yup.string()),
          })
          .noUnknown()
      )
      .test(
        'are-bond',
        'Read, Create, Update and Delete have to be defined all together for a subject field or not at all',
        checkPermissionsAreBond
      ),
  })
  .required()
  .noUnknown();

const validatedUpdatePermissionsInput = data => {
  return updatePermissionsSchema
    .validate(data, { strict: true, abortEarly: true })
    .catch(handleReject);
};

// --- validatePermissionsExist

const checkPermissionsExist = function(permissions) {
  const existingActions = strapi.admin.services.permission.provider.getAll();
  const failIndex = permissions.findIndex(
    permission =>
      !existingActions.find(
        ea =>
          ea.actionId === permission.action &&
          (ea.section !== 'contentTypes' || ea.subjects.includes(permission.subject))
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
  .of(yup.object())
  .test('actions-exist', '', checkPermissionsExist);

const validatePermissionsExist = data => {
  return actionsExistSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

// exports

module.exports = {
  validatedUpdatePermissionsInput,
  validatePermissionsExist,
};
