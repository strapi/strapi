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

const checkPermissionsAreBound = function(permissions) {
  let areBond = true;
  const permsBySubject = _.groupBy(
    permissions.filter(perm => BOUND_ACTIONS.includes(perm.action)),
    'subject'
  );
  _.forIn(permsBySubject, perms => {
    const uniqPerms = _.uniqBy(perms, 'action');
    areBond = uniqPerms.length === BOUND_ACTIONS.length;
    if (!areBond) return false;
    const permsByAction = _.groupBy(uniqPerms, 'action');
    areBond =
      BOUND_ACTIONS.filter(action => action !== 'plugins::content-manager.explorer.delete')
        .map(action => permsByAction[action][0].fields || [])
        .map(f => f.sort())
        .filter((fields, i, arr) => _.isEqual(arr[0], fields)).length ===
      BOUND_ACTIONS.length - 1;
    if (!areBond) return false;
  });

  return areBond;
};

const updatePermissionsSchemaWithBoundConstraint = [
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
    for (const schema of updatePermissionsSchemaWithBoundConstraint) {
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
