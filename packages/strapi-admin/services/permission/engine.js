'use strict';

const _ = require('lodash');
const { map, filter, each } = require('lodash/fp');
const { defineAbility } = require('@casl/ability');

module.exports = conditionProvider => ({
  /**
   * Generate an ability based on the given user (using associated roles & permissions)
   * @param user
   * @param options
   * @returns {Promise<Ability>}
   */
  async generateUserAbility(user, options) {
    const permissions = await strapi.admin.services.permission.findUserPermissions(user);
    const abilityCreator = this.generateAbilityCreatorFor(user);

    return abilityCreator(permissions, options);
  },

  /**
   * Create an ability factory for a specific user
   * @param user
   * @returns {function(*, *): Promise<Ability>}
   */
  generateAbilityCreatorFor(user) {
    return async (permissions, options) =>
      defineAbility(async can => {
        const registerFn = this.createRegisterFunction(can);

        for (const permission of permissions) {
          await this.evaluatePermission({ permission, user, options, registerFn });
        }
      });
  },

  /**
   * Register new rules using `registerFn` based on valid permission's conditions
   * @param permission
   * @param user
   * @param options
   * @param registerFn
   * @returns {Promise<void>}
   */
  async evaluatePermission({ permission, user, options, registerFn }) {
    const { action, subject, fields, conditions } = permission;

    // Directly registers the permission if there is no condition to check/evaluate
    if (_.isUndefined(conditions) || _.isEmpty(conditions)) {
      return registerFn({ action, subject, fields, condition: true });
    }

    // Replace each condition name by its associated value
    const resolveConditions = map(conditionProvider.get);

    // Filter conditions, only keeps objects and functions
    const filterValidConditions = filter(_.isObject);

    // Evaluate the conditions if they're a function, returns the object otherwise
    const evaluateConditions = conditions =>
      Promise.all(conditions.map(cond => (_.isFunction(cond) ? cond(user, options) : cond)));

    // Only keeps 'true' booleans or objects as condition's result
    const filterValidResults = filter(result => result === true || _.isObject(result));

    // Transform each result into registerFn options
    const transformToRegisterOptions = map(result => ({
      action,
      subject,
      fields,
      condition: result,
    }));

    // Register each result using the registerFn
    const registerResults = each(registerFn);

    await Promise.resolve(conditions)
      .then(resolveConditions)
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
    return ({ action, subject, fields, condition }) =>
      can(action, subject, fields, _.isObject(condition) ? condition : undefined);
  },

  /**
   * Check many permissions based on an ability
   */
  checkMany: _.curry((ability, permissions) => {
    return permissions.map(({ action, subject, field }) => ability.can(action, subject, field));
  }),
});
