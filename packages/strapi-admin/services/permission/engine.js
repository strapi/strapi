'use strict';

const {
  curry,
  map,
  filter,
  propEq,
  isFunction,
  isBoolean,
  isArray,
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
const { hooks } = require('strapi-utils');
const permissionDomain = require('../../domain/permission/index');
const { getService } = require('../../utils');

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

const conditionsMatcher = conditions => {
  return sift.createQueryTester(conditions, { operations });
};

const createBoundAbstractPermissionDomain = permission => ({
  get permission() {
    return cloneDeep(permission);
  },

  addCondition(condition) {
    Object.assign(permission, permissionDomain.addCondition(condition, permission));

    return this;
  },
});

module.exports = conditionProvider => {
  const state = {
    hooks: {
      willEvaluatePermission: hooks.createAsyncSeriesHook(),
    },
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
        const registerFn = this.createRegisterFunction(can);

        for (const permission of permissions) {
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
        property => permissionDomain.deleteProperty(property, permission),
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
      const context = createBoundAbstractPermissionDomain(permission);

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
      const { action, subject = 'all', properties = {}, conditions } = permission;

      // Register the permission if there is no condition
      if (isEmpty(conditions)) {
        return registerFn({ action, subject, fields: properties.fields, condition: true });
      }

      /** Set of functions used to resolve + evaluate conditions & register the permission if allowed */

      // 1. Replace each condition name by its associated value
      const resolveConditions = map(conditionProvider.get);

      // 2. Filter conditions, only keep objects and functions
      const filterValidConditions = filter(condition => isObject(condition.handler));

      // 3. Evaluate the conditions if they're a function, returns the object otherwise
      const evaluateConditions = conditions => {
        return Promise.all(
          conditions.map(async cond => ({
            ...cond,
            handler: isFunction(cond.handler)
              ? await cond.handler(
                  user,
                  merge(conditionOptions, { permission: cloneDeep(permission) })
                )
              : cond.handler,
          }))
        );
      };

      // 4. Only keeps booleans or objects as condition's result
      const filterValidResults = filter(
        condition => isBoolean(condition.handler) || isObject(condition.handler)
      );

      /**/

      const evaluatedConditions = await Promise.resolve(conditions)
        .then(resolveConditions)
        .then(filterValidConditions)
        .then(evaluateConditions)
        .then(filterValidResults);

      // Utils
      const filterIsRequired = isRequired => filter(propEq('required', isRequired));
      const pickHandlers = map(prop('handler'));

      // If there is no condition, register the permission as is
      if (isEmpty(evaluatedConditions)) {
        registerFn({ action, subject, fields: properties.fields });
        return;
      }

      const nonRequiredConditions = filterIsRequired(false)(evaluatedConditions);
      const requiredConditions = filterIsRequired(true)(evaluatedConditions);

      // If any required condition has its handler set to false, then don't register the permission at all
      if (requiredConditions.some(propEq('handler', false))) {
        return;
      }

      // If every non required condition is set to false, then don't register the permission at all
      if (
        !isEmpty(nonRequiredConditions) &&
        nonRequiredConditions.every(propEq('handler', false))
      ) {
        return;
      }

      const nonRequiredObjectHandlers = pickHandlers(nonRequiredConditions).filter(isObject);
      const requiredObjectHandlers = pickHandlers(requiredConditions).filter(isObject);

      const builtCondition = { $and: [] };

      if (
        // Don't add the $or clause if there is not any object handler in the non-required conditions
        !isEmpty(nonRequiredObjectHandlers) &&
        // Don't add the $or clause if one of the non-required condition handler
        // is true since it'll validate the $or clause everytime anyway
        !nonRequiredConditions.some(propEq('handler', true))
      ) {
        // Add the non-required conditions handler as a $or clause within the root $and clause
        builtCondition.$and.push({ $or: nonRequiredObjectHandlers });
      }

      // Add the required conditions at the root level of the $and clause
      builtCondition.$and.push(...requiredObjectHandlers);

      const permissionRegisterPayload = {
        action,
        subject,
        fields: properties.fields,
        condition: isEmpty(builtCondition.$and) ? undefined : builtCondition,
      };

      // Register the permission
      registerFn(permissionRegisterPayload);
    },

    /**
     * Encapsulate a register function with custom params to fit `evaluatePermission`'s syntax
     * @param can
     * @returns {function({action?: *, subject?: *, fields?: *, condition?: *}): *}
     */
    createRegisterFunction(can) {
      return ({ action, subject, fields, condition }) => {
        return can(action, subject, fields, isObject(condition) ? condition : undefined);
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
