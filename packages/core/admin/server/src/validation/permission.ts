import { yup, validateYupSchema } from '@strapi/utils';
import { getService } from '../utils';
import validators from './common-validators';

const checkPermissionsSchema = yup.object().shape({
  permissions: yup.array().of(
    yup
      .object()
      .shape({
        action: yup.string().required(),
        subject: yup.string().nullable(),
        field: yup.string(),
      })
      .noUnknown()
  ),
});

const checkPermissionsExist = function (permissions: any) {
  const existingActions = getService('permission').actionProvider.values();
  const failIndex = permissions.findIndex(
    (permission: any) =>
      !existingActions.some(
        (action: any) =>
          action.actionId === permission.action &&
          (action.section !== 'contentTypes' || action.subjects.includes(permission.subject))
      )
  );

  return failIndex === -1
    ? true
    : // @ts-expect-error
      this.createError({
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

export default {
  validatedUpdatePermissionsInput: validateYupSchema(validators.updatePermissions),
  validatePermissionsExist: validateYupSchema(actionsExistSchema),
  validateCheckPermissionsInput: validateYupSchema(checkPermissionsSchema),
};
