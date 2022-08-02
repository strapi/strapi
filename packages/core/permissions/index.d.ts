import { hooks, providerFactory } from '@strapi/utils';

interface Permission {
  action: string;
  subject?: string | object | null;
  properties?: object;
  conditions?: string[];
}

type Provider = ReturnType<typeof providerFactory>;

interface BaseAction {
  actionId: string;
}

interface BaseCondition {
  name: string;
  handler(...params: unknown[]): boolean | object;
}

interface ActionProvider<T extends Action = Action> extends Provider {}
interface ConditionProvider<T extends Condition = Condition> extends Provider {}

interface PermissionEngineHooks {
  'before-format::validate.permission': ReturnType<typeof hooks.createAsyncBailHook>;
  'format.permission': ReturnType<typeof hooks.createAsyncSeriesWaterfallHook>;
  'post-format::validate.permission': ReturnType<typeof hooks.createAsyncBailHook>;
  'before-evaluate.permission': ReturnType<typeof hooks.createAsyncSeriesHook>;
  'before-register.permission': ReturnType<typeof hooks.createAsyncSeriesHook>;
}

type PermissionEngineHookCreator = () => PermissionEngineHooks;

type PermissionEngineHookName = keyof PermissionEngineHooks;

interface PermissionEngine {
  hooks: object;

  on(hook: PermissionEngineHookName, handler: Function): PermissionEngine;
  generateAbility(permissions: Permission[], options?: object): Ability;
  createRegisterFunction(can: Function, options: object): Function;
}

interface BaseAbility {
  can: Function;
}

interface AbilityBuilder {
  can(permission: Permission): void | Promise<void>;
  build(): BaseAbility | Promise<BaseAbility>;
}

interface PermissionEngineParams {
  providers: { action: ActionProvider; condition: ConditionProvider };
  abilityBuilderFactory(): AbilityBuilder;
}
