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

interface PermissionEngine {
  hooks: object;

  generateAbility(permissions: Permission[], options?: object): Ability;
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
