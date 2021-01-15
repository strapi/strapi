'use strict';

const _ = require('lodash');
const { yup, formatYupErrors } = require('strapi-utils');
const { AUTHOR_CODE, PUBLISH_ACTION } = require('../services/constants');
const {
  BOUND_ACTIONS_FOR_FIELDS,
  BOUND_ACTIONS,
  getBoundActionsBySubject,
} = require('../domain/role');
const validators = require('./common-validators');

const handleReject = error => Promise.reject(formatYupErrors(error));

// validatedUpdatePermissionsInput

const actionFieldsAreEqual = (a, b) => {
  const aFields = a.fields || [];
  const bFields = b.fields || [];

  return _.isEqual(aFields.sort(), bFields.sort());
};

const haveSameFieldsAsOtherActions = (a, i, allActions) =>
  allActions.slice(i + 1).every(b => actionFieldsAreEqual(a, b));

const checkPermissionsAreBound = role =>
  function(permissions) {
    const permsBySubject = _.groupBy(
      permissions.filter(perm => BOUND_ACTIONS.includes(perm.action)),
      'subject'
    );

    for (const [subject, perms] of Object.entries(permsBySubject)) {
      const boundActions = getBoundActionsBySubject(role, subject);
      const missingActions =
        _.xor(
          perms.map(p => p.action),
          boundActions
        ).length !== 0;
      if (missingActions) return false;

      const permsBoundByFields = perms.filter(p => BOUND_ACTIONS_FOR_FIELDS.includes(p.action));
      const everyActionsHaveSameFields = _.every(permsBoundByFields, haveSameFieldsAsOtherActions);
      if (!everyActionsHaveSameFields) return false;
    }

    return true;
  };

const noPublishPermissionForAuthorRole = role =>
  function(permissions) {
    const isAuthor = role.code === AUTHOR_CODE;
    const hasPublishPermission = permissions.some(perm => perm.action === PUBLISH_ACTION);

    return !(isAuthor && hasPublishPermission);
  };

const getUpdatePermissionsSchemas = role => [
  validators.updatePermissions,
  yup.object().shape({ permissions: actionsExistSchema.clone() }),
  yup.object().shape({
    permissions: yup
      .array()
      .test(
        'author-no-publish',
        'The author role cannot have the publish permission.',
        noPublishPermissionForAuthorRole(role)
      ),
  }),
  yup.object().shape({
    permissions: yup
      .array()
      .test(
        'are-bond',
        'Permissions have to be defined all together for a subject field or not at all',
        checkPermissionsAreBound(role)
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

const validatedUpdatePermissionsInput = async (permissions, role) => {
  try {
    const schemas = getUpdatePermissionsSchemas(role);
    for (const schema of schemas) {
      await schema.validate(permissions, { strict: true, abortEarly: false });
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
