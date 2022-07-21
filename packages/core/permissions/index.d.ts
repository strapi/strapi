import { Ability } from '@casl/ability';
import { hooks, providerFactory } from '@strapi/utils';

type Provider = ReturnType<typeof providerFactory>;

interface Permission {
  action: string;
  subject?: string | object;
  properties?: object;
  conditions?: string[];
}

interface Action {
  name: string;
  section: string;
}

interface Condition {
  name: string;

  handler(): boolean | object;
}

type StrapiHook<
  T extends keyof Pick<
    typeof hooks,
    'createAsyncParallelHook' | 'createAsyncSeriesHook' | 'createAsyncSeriesWaterfallHook'
  >
> = ReturnType<typeof hooks[T]>;

interface EngineHooks {
  willEvaluatePermission: StrapiHook<'createAsyncSeriesHook'>;
  willRegisterPermission: StrapiHook<'createAsyncSeriesHook'>;
}

interface ActionProvider<T extends Action = Action> extends Provider {}
interface ConditionProvider<T extends Condition = Condition> extends Provider {}

interface PermissionEngine {
  hooks: EngineHooks;

  generateAbility(permissions: Permission[], options?: object): Ability;
}

interface PermissionEngineParams {
  providers: { action: ActionProvider; condition: ConditionProvider };
  abilityBuilderFactory(): { can: Function; build: Function };
}
