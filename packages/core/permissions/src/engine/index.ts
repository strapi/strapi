import _ from 'lodash/fp';
import { Ability } from '@casl/ability';
import { providerFactory } from '@strapi/utils';

import {
  createEngineHooks,
  createWillRegisterContext,
  createBeforeEvaluateContext,
  createValidateContext,
} from './hooks';
import type { PermissionEngineHooks, HookName } from './hooks';

import * as abilities from './abilities';
import { Permission } from '../domain/permission';

export { abilities };

type Provider = ReturnType<typeof providerFactory>;
type ActionProvider = Provider;
type ConditionProvider = Provider;

export interface Engine {
  hooks: PermissionEngineHooks;
  on(hook: HookName, handler: (...args: unknown[]) => unknown): Engine;
  generateAbility(permissions: Permission[], options?: object): Promise<Ability>;
  createRegisterFunction(
    can: (permission: abilities.PermissionRule) => unknown,
    options: Record<string, unknown>
  ): (permission: abilities.PermissionRule) => Promise<unknown>;
}

export interface EngineParams {
  providers: { action: ActionProvider; condition: ConditionProvider };
  abilityBuilderFactory?(): abilities.CustomAbilityBuilder;
}

interface EvaluateParams {
  options: Record<string, unknown>;
  register: (permission: abilities.PermissionRule) => Promise<unknown>;
  permission: Permission;
}

interface Condition {
  name: string;
  handler(...params: unknown[]): boolean | object;
}

/**
 * Create a default state object for the engine
 */
const createEngineState = () => {
  const hooks = createEngineHooks();

  return { hooks };
};

const newEngine = (params: EngineParams): Engine => {
  const { providers, abilityBuilderFactory = abilities.caslAbilityBuilder } = params;

  const state = createEngineState();

  const runValidationHook = async (hook: HookName, context: unknown) =>
    state.hooks[hook].call(context);

  /**
   * Evaluate a permission using local and registered behaviors (using hooks).
   * Validate, format (add condition, etc...), evaluate (evaluate conditions) and register a permission
   */
  const evaluate = async (params: EvaluateParams) => {
    const { options, register } = params;

    const preFormatValidation = await runValidationHook(
      'before-format::validate.permission',
      createBeforeEvaluateContext(params.permission)
    );

    if (preFormatValidation === false) {
      return;
    }

    const permission = (await state.hooks['format.permission'].call(
      params.permission
    )) as Permission;

    const afterFormatValidation = await runValidationHook(
      'after-format::validate.permission',
      createValidateContext(permission)
    );

    if (afterFormatValidation === false) {
      return;
    }

    await state.hooks['before-evaluate.permission'].call(createBeforeEvaluateContext(permission));

    const { action, subject, properties, conditions = [] } = permission;

    if (conditions.length === 0) {
      return register({ action, subject, properties });
    }

    const resolveConditions = _.map(providers.condition.get);

    const removeInvalidConditions = _.filter((condition: Condition) =>
      _.isFunction(condition.handler)
    );

    const evaluateConditions = (conditions: Condition[]) => {
      return Promise.all(
        conditions.map(async (condition) => ({
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

    if (evaluatedConditions.every(resultPropEq(false))) {
      return;
    }

    if (_.isEmpty(evaluatedConditions) || evaluatedConditions.some(resultPropEq(true))) {
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

  return {
    get hooks() {
      return state.hooks;
    },

    /**
     * Create a register function that wraps a `can` function
     * used to register a permission in the ability builder
     */
    createRegisterFunction(can, options: Record<string, unknown>) {
      return async (permission: abilities.PermissionRule) => {
        const hookContext = createWillRegisterContext({ options, permission });

        await state.hooks['before-register.permission'].call(hookContext);

        return can(permission);
      };
    },

    /**
     * Register a new handler for a given hook
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
     */
    async generateAbility(permissions, options: Record<string, unknown> = {}) {
      const { can, build } = abilityBuilderFactory();

      for (const permission of permissions) {
        const register = this.createRegisterFunction(can, options);

        await evaluate({ permission, options, register });
      }

      return build();
    },
  };
};

export { newEngine as new };
