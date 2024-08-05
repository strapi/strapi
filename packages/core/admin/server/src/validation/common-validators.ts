import { yup } from '@strapi/utils';
import _ from 'lodash';
import { isEmpty, has, isNil, isArray } from 'lodash/fp';
import { getService } from '../utils';
import actionDomain, { type Action } from '../domain/action';
import { checkFieldsAreCorrectlyNested, checkFieldsDontHaveDuplicates } from './common-functions';
import actions from '../domain/action/index';

const { actionFields } = actions;

const getActionFromProvider = (actionId: string) => {
  return getService('permission').actionProvider.get(actionId);
};

export const email = yup.string().email().lowercase();

export const firstname = yup.string().trim().min(1);

export const lastname = yup.string();

export const username = yup.string().min(1);

export const password = yup
  .string()
  .min(8)
  .matches(/[a-z]/, '${path} must contain at least one lowercase character')
  .matches(/[A-Z]/, '${path} must contain at least one uppercase character')
  .matches(/\d/, '${path} must contain at least one number');

export const roles = yup.array(yup.strapiID()).min(1);

const isAPluginName = yup
  .string()
  .test('is-a-plugin-name', 'is not a plugin name', function (value) {
    return [undefined, 'admin', ...Object.keys(strapi.plugins)].includes(value)
      ? true
      : this.createError({ path: this.path, message: `${this.path} is not an existing plugin` });
  });

export const arrayOfConditionNames = yup
  .array()
  .of(yup.string())
  .test('is-an-array-of-conditions', 'is not a plugin name', function (value) {
    const ids = strapi.service('admin::permission').conditionProvider.keys();
    return _.isUndefined(value) || _.difference(value, ids).length === 0
      ? true
      : this.createError({ path: this.path, message: `contains conditions that don't exist` });
  });

export const permissionsAreEquals = (a: any, b: any) =>
  a.action === b.action && (a.subject === b.subject || (_.isNil(a.subject) && _.isNil(b.subject)));

const checkNoDuplicatedPermissions = (permissions: unknown) =>
  !Array.isArray(permissions) ||
  permissions.every((permA, i) =>
    permissions.slice(i + 1).every((permB) => !permissionsAreEquals(permA, permB))
  );

const checkNilFields = (action: Action) =>
  function (fields: typeof actionFields) {
    // If the parent has no action field, then we ignore this test
    if (isNil(action)) {
      return true;
    }

    return actionDomain.appliesToProperty('fields', action) || isNil(fields);
  };

const fieldsPropertyValidation = (action: Action) =>
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
      // @ts-expect-error yup types
      checkNilFields(action)
    );

export const permission = yup
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
        // @ts-expect-error yup types
        const action = getActionFromProvider(this.options.parent.action);

        if (!action) {
          return true;
        }

        if (isNil(action.subjects)) {
          return isNil(subject);
        }

        if (isArray(action.subjects) && !isNil(subject)) {
          return action.subjects.includes(subject);
        }

        return false;
      }),
    properties: yup
      .object()
      .test('properties-structure', 'Invalid property set at ${path}', function (properties) {
        // @ts-expect-error yup types
        const action = getActionFromProvider(this.options.parent.action) as any;
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
          // @ts-expect-error yup types
          const action = getActionFromProvider(this.options.parent.action) as any;

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
          } catch (e: any) {
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

export const updatePermissions = yup
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

export default {
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
