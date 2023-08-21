'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const { getService } = require('../utils');
const validators = require('./common-validators');

const updatePermissions = yup.object().shape({
  permissions: yup
    .object()
    .shape({
      connect: yup.array().of(
        yup.object().shape({
          id: yup.strapiID(), // If id is not provided, it will be generated
          ...validators.permission.fields,
        })
      ),
      disconnect: yup.array().of(yup.object().shape({ id: yup.strapiID().required() })),
    })
    .required(),
});

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

const checkPermissionsExist = function (permissions) {
  const existingActions = getService('permission').actionProvider.values();
  const failIndex = permissions.findIndex(
    (permission) =>
      !existingActions.some(
        (action) =>
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

// exports

module.exports = {
  validatedUpdatePermissionsInput: validateYupSchema(updatePermissions),
  validatePermissionsExist: validateYupSchema(actionsExistSchema),
  validateCheckPermissionsInput: validateYupSchema(checkPermissionsSchema),
};
