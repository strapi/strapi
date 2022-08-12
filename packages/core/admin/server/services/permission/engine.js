'use strict';

const {
  curry,
  map,
  filter,
  propEq,
  isFunction,
  isBoolean,
  isArray,
  isNil,
  isEmpty,
  isObject,
  prop,
  merge,
  pick,
  difference,
  cloneDeep,
} = require('lodash/fp');
const { AbilityBuilder, Ability } = require('@casl/ability');
const sift = require('sift');
const permissionDomain = require('../../domain/permission/index');
const { getService } = require('../../utils');
const {
  createEngineHooks,
  createWillEvaluateContext,
  createWillRegisterContext,
} = require('./engine-hooks');

const allowedOperations = [
  '$or',
  '$and',
  '$eq',
  '$ne',
  '$in',
  '$nin',
  '$lt',
  '$lte',
  '$gt',
  '$gte',
  '$exists',
  '$elemMatch',
];
const operations = pick(allowedOperations, sift);

const conditionsMatcher = (conditions) => {
  return sift.createQueryTester(conditions, { operations });
};

module.exports = (conditionProvider) => {
  const state = {
    hooks: createEngineHooks(),
  };

  return {
    hooks: state.hooks,

    /**
     * Generate an ability based on the given user (using associated roles & permissions)
     * @param user
     * @param options
     * @returns {Promise<Ability>}
     */
    async generateUserAbility(user, options) {
      const permissions = await getService('permission').findUserPermissions(user);
      const abilityCreator = this.generateAbilityCreatorFor(user);

      return abilityCreator(permissions, options);
    },

    /**
     * Create an ability factory for a specific user
     * @param user
     * @returns {function(*, *): Promise<Ability>}
     */
    generateAbilityCreatorFor(user) {
      return async (permissions, options) => {
        const { can, build } = new AbilityBuilder(Ability);

        for (const permission of permissions) {
          const registerFn = this.createRegisterFunction(can, permission, user);

          await this.evaluate({ permission, user, options, registerFn });
        }

        return build({ conditionsMatcher });
      };
    },

    /**
     * Validate, invalidate and transform the permission attributes
     * @param {Permission} permission
     * @returns {null|Permission}
     */
    formatPermission(permission) {
      const { actionProvider } = getService('permission');

      const action = actionProvider.get(permission.action);

      // If the action isn't registered into the action provider, then ignore the permission
      if (!action) {
        return null;
      }

      const properties = permission.properties || {};

      // Only keep the properties allowed by the action (action.applyToProperties)
      const propertiesName = Object.keys(properties);
      const invalidProperties = difference(
        propertiesName,
        action.applyToProperties || propertiesName
      );

      const permissionWithSanitizedProperties = invalidProperties.reduce(
        (property) => permissionDomain.deleteProperty(property, permission),
        permission
      );

      // If the `fields` property is an empty array, then ignore the permission
      const { fields } = properties;

      if (isArray(fields) && isEmpty(fields)) {
        return null;
      }

      return permissionWithSanitizedProperties;
    },

    /**
     * Update the permission components through various processing
     * @param {Permission} permission
     * @returns {Promise<void>}
     */
    async applyPermissionProcessors(permission) {
      const context = createWillEvaluateContext(permission);

      // 1. Trigger willEvaluatePermission hook and await transformation operated on the permission
      await state.hooks.willEvaluatePermission.call(context);
    },

    /**
     * Register new rules using `registerFn` based on valid permission's conditions
     * @param options {object}
     * @param options.permission {object}
     * @param options.user {object}
     * @param options.options {object | undefined}
     * @param options.registerFn {Function}
     * @returns {Promise<void>}
     */
    async evaluate(options) {
      const { user, registerFn, options: conditionOptions } = options;

      // Assert options.permission validity and format it
      const permission = this.formatPermission(options.permission);

      // If options.permission is invalid, then ignore the permission
      if (permission === null) {
        return;
      }

      await this.applyPermissionProcessors(permission);

      // Extract the up-to-date components from the permission
      const { action, subject, properties = {}, conditions } = permission;

      // Register the permission if there is no condition
      if (isEmpty(conditions)) {
        return registerFn({ action, subject, fields: properties.fields });
      }

      /** Set of functions used to resolve + evaluate conditions & register the permission if allowed */

      // 1. Replace each condition name by its associated value
      const resolveConditions = map(conditionProvider.get);

      // 2. Filter conditions, only keep those whose handler is a function
      const filterValidConditions = filter((condition) => isFunction(condition.handler));

      // 3. Evaluate the conditions handler and returns an object
      // containing both the original condition and its result
      const evaluateConditions = (conditions) => {
        return Promise.all(
          conditions.map(async (condition) => ({
            condition,
            result: await condition.handler(
              user,
              merge(conditionOptions, { permission: cloneDeep(permission) })
            ),
          }))
        );
      };

      // 4. Only keeps booleans or objects as condition's result
      const filterValidResults = filter(({ result }) => isBoolean(result) || isObject(result));

      /**/

      const evaluatedConditions = await Promise.resolve(conditions)
        .then(resolveConditions)
        .then(filterValidConditions)
        .then(evaluateConditions)
        .then(filterValidResults);

      // Utils
      const resultPropEq = propEq('result');
      const pickResults = map(prop('result'));

      if (evaluatedConditions.every(resultPropEq(false))) {
        return;
      }

      // If there is no condition or if one of them return true, register the permission as is
      if (isEmpty(evaluatedConditions) || evaluatedConditions.some(resultPropEq(true))) {
        return registerFn({ action, subject, fields: properties.fields });
      }

      const results = pickResults(evaluatedConditions).filter(isObject);

      if (isEmpty(results)) {
        return registerFn({ action, subject, fields: properties.fields });
      }

      // Register the permission
      return registerFn({
        action,
        subject,
        fields: properties.fields,
        condition: { $and: [{ $or: results }] },
      });
    },

    /**
     * Encapsulate a register function with custom params to fit `evaluatePermission`'s syntax
     * @param can
     * @param {Permission} permission
     * @param {object} user
     * @returns {function}
     */
    createRegisterFunction(can, permission, user) {
      const registerToCasl = (caslPermission) => {
        const { action, subject, fields, condition } = caslPermission;

        can(
          action,
          isNil(subject) ? 'all' : subject,
          fields,
          isObject(condition) ? condition : undefined
        );
      };

      const runWillRegisterHook = async (caslPermission) => {
        const hookContext = createWillRegisterContext(caslPermission, {
          permission,
          user,
        });

        await state.hooks.willRegisterPermission.call(hookContext);

        return caslPermission;
      };

      return async (caslPermission) => {
        await runWillRegisterHook(caslPermission);
        registerToCasl(caslPermission);
      };
    },

    /**
     * Check many permissions based on an ability
     */
    checkMany: curry((ability, permissions) => {
      return permissions.map(({ action, subject, field }) => ability.can(action, subject, field));
    }),
  };
};
