'use strict';

const _ = require('lodash/fp');

const abilities = require('./abilities');

const {
  createEngineHooks,
  createWillRegisterContext,
  createBeforeEvaluateContext,
  createFormatContext,
  createValidateContext,
} = require('./hooks');

/**
 * @typedef {import("../..").PermissionEngine} PermissionEngine
 * @typedef {import("../..").ActionProvider} ActionProvider
 * @typedef {import("../..").ConditionProvider} ConditionProvider
 * @typedef {import("../..").PermissionEngineParams} PermissionEngineParams
 * @typedef {import("../..").Permission} Permission
 */

/**
 * Create a default state object for the engine
 */
const createEngineState = () => {
  const hooks = createEngineHooks();

  return { hooks };
};

module.exports = {
  abilities,

  /**
   * Create a new instance of a permission engine
   *
   * @param {PermissionEngineParams} params
   *
   * @return {PermissionEngine}
   */
  new(params) {
    const { providers, abilityBuilderFactory = abilities.caslAbilityBuilder } = params;

    const state = createEngineState();

    const runValidationHook = async (hook, context) => state.hooks[hook].call(context);

    /**
     * Evaluate a permission using local and registered behaviors (using hooks).
     * Validate, format (add condition, etc...), evaluate (evaluate conditions) and register a permission
     *
     * @param {object} params
     * @param {object} params.options
     * @param {Function} params.register
     * @param {Permission} params.permission
     */
    const evaluate = async params => {
      const { options, register, permission } = params;

      const preFormatValidation = await runValidationHook(
        'before-format::validate.permission',
        createBeforeEvaluateContext(permission)
      );

      if (preFormatValidation === false) {
        return;
      }

      await state.hooks['format.permission'].call(createFormatContext(permission));

      const postFormatValidation = await runValidationHook(
        'post-format::validate.permission',
        createValidateContext(permission)
      );

      if (postFormatValidation === false) {
        return;
      }

      await state.hooks['before-evaluate.permission'].call(createBeforeEvaluateContext(permission));

      const { action, subject, properties, conditions = [] } = permission;

      if (conditions.length === 0) {
        return register({ action, subject, properties });
      }

      const resolveConditions = _.map(providers.condition.get);

      const removeInvalidConditions = _.filter(condition => _.isFunction(condition.handler));

      const evaluateConditions = conditions => {
        return Promise.all(
          conditions.map(async condition => ({
            condition,
            result: await condition.handler(
              _.merge(options, { permission: _.cloneDeep(permission) })
            ),
          }))
        );
      };

      const removeInvalidResults = _.filter(
        ({ result }) => _.isBoolean(result) || _.isObject(result)
      );

      const evaluatedConditions = await Promise.resolve(conditions)
        .then(resolveConditions)
        .then(removeInvalidConditions)
        .then(evaluateConditions)
        .then(removeInvalidResults);

      const resultPropEq = _.propEq('result');
      const pickResults = _.map(_.prop('result'));

      if (evaluatedConditions.every(resultPropEq(true))) {
        return;
      }

      if (_.isEmpty(evaluatedConditions) || evaluatedConditions.some(resultPropEq(false))) {
        return register({ action, subject, properties });
      }

      const results = pickResults(evaluatedConditions).filter(_.isObject);

      if (_.isEmpty(results)) {
        return register({ action, subject, properties });
      }

      return register({
        action,
        subject,
        properties,
        condition: { $and: [{ $or: results }] },
      });
    };

    /**
     * Create a register function that wraps a `can` function
     * used to register a permission in the ability builder
     *
     * @param {Function} can
     * @param {object} options
     *
     * @return {Function}
     */
    const createRegisterFunction = (can, options) => {
      return async permission => {
        const hookContext = createWillRegisterContext({ options, permission });

        await state.hooks['before-register.permission'].call(hookContext);

        return can(permission);
      };
    };

    return {
      get hooks() {
        return state.hooks;
      },

      /**
       * Register a new handler for a given hook
       *
       * @param {string} hook
       * @param {Function} handler
       *
       * @return {this}
       */
      on(hook, handler) {
        const validHooks = Object.keys(state.hooks);
        const isValidHook = validHooks.includes(hook);

        if (!isValidHook) {
          throw new Error(
            `Invalid hook supplied when trying to register an handler to the permission engine. Got "${hook}" but expected one of ${validHooks.join(
              ', '
            )}`
          );
        }

        state.hooks[hook].register(handler);

        return this;
      },

      /**
       * Generate an ability based on the instance's
       * ability builder and the given permissions
       *
       * @param {Permission[]} permissions
       * @param {object} [options]
       *
       * @return {object}
       */
      async generateAbility(permissions, options = {}) {
        const { can, build } = abilityBuilderFactory();

        for (const permission of permissions) {
          const register = createRegisterFunction(can, options);

          await evaluate({ permission, options, register });
        }

        return build();
      },
    };
  },
};
