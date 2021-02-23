'use strict';

const {
  curry,
  map,
  filter,
  each,
  isFunction,
  isArray,
  isEmpty,
  isObject,
  prop,
  merge,
  pick,
  difference,
} = require('lodash/fp');
const { AbilityBuilder, Ability } = require('@casl/ability');
const sift = require('sift');
const { getService } = require('../../utils');

const allowedOperations = [
  '$or',
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

module.exports = conditionProvider => {
  const permissionsHandlers = [];

  return {
    registerPermissionsHandler(handler) {
      if (isFunction(handler)) {
        permissionsHandlers.push(handler);
      }
    },

    registerPermissionsHandlers(handlers) {
      for (const handler of handlers) {
        this.registerPermissionsHandler(handler);
      }
    },

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

      const action = actionProvider.getByActionId(permission.action);

      // If the action isn't registered into the action provider, then ignore the permission
      if (!action) {
        return null;
      }

      // Only keep the properties allowed by the action (action.applyToProperties)
      const propertiesName = Object.keys(permission.properties);
      const invalidProperties = difference(
        propertiesName,
        action.applyToProperties || propertiesName
      );

      invalidProperties.forEach(property => permission.deleteProperty(property));

      // If the `fields` property is an empty array, then ignore the permission
      const { fields } = permission.properties;

      if (isArray(fields) && isEmpty(fields)) {
        return null;
      }

      return permission;
    },

    /**
     * Update the permission components through various processing
     * @param {Permission} permission
     * @returns {Promise<void>}
     */
    async applyPermissionProcessors(permission) {
      // 1. Evaluate every registered permissions handler
      await Promise.all(permissionsHandlers.map(handler => handler(permission)));
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
      const { action, subject = 'all', properties, conditions } = permission;

      // Register the permission if there is no condition
      if (isEmpty(conditions)) {
        return registerFn({ action, subject, fields: properties.fields, condition: true });
      }

      /** Set of functions used to resolve + evaluate conditions & register the permission if allowed */

      // 1. Replace each condition name by its associated value
      const resolveConditions = map(conditionProvider.getById);

      // 2. Only keep the handler of each condition
      const pickHandlers = map(prop('handler'));

      // 3. Filter conditions, only keep objects and functions
      const filterValidConditions = filter(isObject);

      // 4. Evaluate the conditions if they're a function, returns the object otherwise
      const evaluateConditions = conditions => {
        return Promise.all(
          conditions.map(cond =>
            isFunction(cond) ? cond(user, merge(conditionOptions, permission.json)) : cond
          )
        );
      };

      // 5. Only keeps 'true' booleans or objects as condition's result
      const filterValidResults = filter(result => result === true || isObject(result));

      // 6. Transform each result into registerFn options
      const transformToRegisterOptions = map(result => ({
        action,
        subject,
        fields: properties.fields,
        condition: result,
      }));

      // 7. Register each result using the registerFn
      const registerResults = each(registerFn);

      /**/

      // Execute all the steps needed to register the permission with its associated conditions
      await Promise.resolve(conditions)
        .then(resolveConditions)
        .then(pickHandlers)
        .then(filterValidConditions)
        .then(evaluateConditions)
        .then(filterValidResults)
        .then(transformToRegisterOptions)
        .then(registerResults);
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
