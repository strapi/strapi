'use strict';

const _ = require('lodash');
const { yup, formatYupErrors } = require('strapi-utils');
const validators = require('./common-validators');

const handleReject = error => Promise.reject(formatYupErrors(error));

// validatedUpdatePermissionsInput

const BOUND_ACTIONS = [
  'plugins::content-manager.explorer.read',
  'plugins::content-manager.explorer.create',
  'plugins::content-manager.explorer.update',
  'plugins::content-manager.explorer.delete',
];

const BOUND_ACTIONS_FOR_FIELDS = [
  'plugins::content-manager.explorer.read',
  'plugins::content-manager.explorer.create',
  'plugins::content-manager.explorer.update',
];

const actionFieldsAreEqual = (a, b) => {
  const aFields = a.fields || [];
  const bFields = b.fields || [];

  return _.isEqual(aFields.sort(), bFields.sort());
};

const haveSameFieldsAsOtherActions = (a, i, allActions) =>
  allActions.slice(i + 1).every(b => actionFieldsAreEqual(a, b));

const checkPermissionsAreBound = function(permissions) {
  const permsBySubject = _.groupBy(
    permissions.filter(perm => BOUND_ACTIONS.includes(perm.action)),
    'subject'
  );

  for (const perms of Object.values(permsBySubject)) {
    const missingActions =
      _.xor(
        perms.map(p => p.action),
        BOUND_ACTIONS
      ).length !== 0;
    if (missingActions) return false;

    const permsBoundByFields = perms.filter(p => BOUND_ACTIONS_FOR_FIELDS.includes(p.action));
    const everyActionsHaveSameFields = _.every(permsBoundByFields, haveSameFieldsAsOtherActions);
    if (!everyActionsHaveSameFields) return false;
  }

  return true;
};

const updatePermissionsSchemas = [
  validators.updatePermissions,
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
    for (const schema of updatePermissionsSchemas) {
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
        action =>
          action.actionId === permission.action &&
          (action.section !== 'contentTypes' || action.subjects.includes(permission.subject))
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
      conditions: yup.array().of(yup.string()),
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
