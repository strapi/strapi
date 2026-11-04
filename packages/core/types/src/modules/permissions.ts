import type { Ability, Subject } from '@casl/ability';

import type { AsyncBailHook, AsyncSeriesHook, AsyncSeriesWaterfallHook } from './hooks';

export interface ParametrizedAction {
  name: string;
  params: Record<string, unknown>;
}
export interface PermissionRule {
  action: string | ParametrizedAction;
  subject?: Subject | null;
  properties?: {
    fields?: string[];
  };
  condition?: Record<string, unknown>;
}

/**
 * A permission as stored by Strapi, before it is turned into a CASL rule.
 *
 * @internal Public through `@strapi/permissions` only.
 */
export interface Permission {
  action: string;
  actionParameters?: Record<string, unknown>;
  subject?: string | object | null;
  properties?: Record<string, any>;
  conditions?: string[];
}

/**
 * Hooks a permission engine runs while it turns permissions into an ability.
 *
 * @internal Public through `@strapi/permissions` only.
 */
export interface EngineHooks {
  'before-format::validate.permission': AsyncBailHook;
  'format.permission': AsyncSeriesWaterfallHook;
  'after-format::validate.permission': AsyncBailHook;
  'before-evaluate.permission': AsyncSeriesHook;
  'before-register.permission': AsyncSeriesHook;
}

/** @internal Public through `@strapi/permissions` only. */
export type EngineHookName = keyof EngineHooks;

/**
 * Turns permissions into a CASL ability. Created by `engine.new()` from `@strapi/permissions`.
 *
 * @internal Public through `@strapi/permissions` only.
 */
export interface Engine {
  hooks: EngineHooks;
  on(hook: EngineHookName, handler: (...args: any[]) => any): Engine;
  generateAbility(permissions: Permission[], options?: object): Promise<Ability>;
  createRegisterFunction(
    can: (permission: PermissionRule) => unknown,
    options: Record<string, unknown>
  ): (permission: PermissionRule) => Promise<unknown>;
}
