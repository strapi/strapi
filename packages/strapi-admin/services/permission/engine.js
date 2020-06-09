'use strict';

const _ = require('lodash');
const { map, filter, forEach } = require('lodash/fp');
const { defineAbility } = require('@casl/ability');

module.exports = conditionProvider => ({
  /**
   * Generate an ability based on the given user (using associated roles & permissions)
   * @param user
   * @param options
   * @returns {Promise<Ability>}
   */
  async generateUserAbility(user, options) {
    const permissions = await this.findPermissionsForUser(user);
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

    // Transform a conditionName into its associated value in the conditionProvider
    const resolve = conditionProvider.get;

    // A valid condition is either a function or an object
    const isValidCondition = condition => _.isFunction(condition) || _.isObject(condition);

    // If the resolved condition is a function, we need to call it and return its result
    const evaluate = async cond =>
      _.isFunction(cond) ? await cond(user, options) : Promise.resolve(cond);

    // A final valid result (for a condition) is either a 'true' boolean or an object
    const isValidResult = result => result === true || _.isObject(result);

    // Transform a final valid result into a registerFn options's object
    const toRegisterOptions = result => ({ action, subject, fields, condition: result });

    // Directly registers the permission if there is no condition to check/evaluate
    if (_.isUndefined(conditions) || _.isEmpty(conditions)) {
      return registerFn(toRegisterOptions(true));
    }

    await Promise.resolve(conditions)
      .then(map(resolve))
      .then(filter(isValidCondition))
      .then(conditions => Promise.all(conditions.map(evaluate)))
      .then(filter(isValidResult))
      .then(map(toRegisterOptions))
      .then(forEach(registerFn));
  },

  /**
   * Use the user's roles to find and flatten associated permissions.
   * @param user
   * @returns {Promise<Array>}
   */
  async findPermissionsForUser(user) {
    const rolesId = user.roles.map(_.property('id'));
    const roles = await strapi.query('role', 'admin').find({ id_in: rolesId }, ['permissions']);

    return _.flatMap(roles, _.property('permissions'));
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
});
