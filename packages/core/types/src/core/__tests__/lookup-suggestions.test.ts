import type * as UID from '../../uid';
import type { ControllerLookupName } from '../controller';
import type { MiddlewareLookupName, MiddlewareReference } from '../middleware';
import type { Module } from '../module';
import type { PolicyReference } from '../policy';
import type { ServiceLookupName } from '../service';
import type { ConfigPathSuggestion, Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

// Completion candidates are checked as types: editors list the literal members of these types.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::suggest-lab.greeting': { greet(): string };
      }
      interface AppServices {
        'api::suggest-lab.greeting': { greet(): string };
      }
      interface PackageControllers {
        'plugin::suggest-lab.items': { list(): void };
      }
      interface PackagePolicies {
        'plugin::suggest-lab.isOwner': undefined;
      }
      interface PackageMiddlewares {
        'plugin::suggest-lab.timer': undefined;
      }
      interface PackageConfigs {
        'plugin::suggest-lab': {
          provider: { name: string; options?: { port: number } | null };
          items: { port: number }[];
          enabled: boolean;
        };
      }
    }
  }
}

// A literal extends a `string` or UID pattern whether or not the union lists it: `Includes` only
// checks that a type is accepted.
type Includes<TUnion, TMember> = TMember extends TUnion ? true : false;
// `Extract` keeps a literal only when the union lists it: a plain `string` or UID pattern drops it.
type Lists<TName, TMember> = Equal<Extract<TName, TMember>, TMember>;

type LabConfig = Strapi.Registries.PackageConfigs['plugin::suggest-lab'];

declare const pathChecks: [
  // Only the level being typed is suggested: the parent's keys, never deeper paths.
  Expect<Equal<ConfigPathSuggestion<LabConfig, ''>, 'provider' | 'items' | 'enabled'>>,
  Expect<Equal<ConfigPathSuggestion<LabConfig, 'prov'>, 'provider' | 'items' | 'enabled'>>,
  Expect<Equal<ConfigPathSuggestion<LabConfig, 'provider.'>, 'provider.name' | 'provider.options'>>,
  Expect<
    Equal<ConfigPathSuggestion<LabConfig, 'provider.na'>, 'provider.name' | 'provider.options'>
  >,
  // Nullable parents still list their keys.
  Expect<Equal<ConfigPathSuggestion<LabConfig, 'provider.options.'>, 'provider.options.port'>>,
  // Arrays, primitives and unknown parents have no suggested keys.
  Expect<Equal<ConfigPathSuggestion<LabConfig, 'items.'>, never>>,
  Expect<Equal<ConfigPathSuggestion<LabConfig, 'enabled.'>, never>>,
  Expect<Equal<ConfigPathSuggestion<LabConfig, 'missing.'>, never>>,
  Expect<Equal<ConfigPathSuggestion<LabConfig, string[]>, never>>,
];
pathChecks satisfies unknown;

declare const nameChecks: [
  // Full UID lookups list registered UIDs, and keep accepting every UID of the pattern.
  Expect<Lists<ServiceLookupName, 'plugin::suggest-lab.greeting'>>,
  Expect<Lists<ServiceLookupName, 'api::suggest-lab.greeting'>>,
  Expect<Includes<ServiceLookupName, UID.Service>>,
  Expect<Lists<ControllerLookupName, 'plugin::suggest-lab.items'>>,
  Expect<Includes<ControllerLookupName, UID.Controller>>,
  // Typed route policies list registered names in both switch states.
  Expect<Lists<PolicyReference, 'plugin::suggest-lab.isOwner'>>,
  Expect<Lists<PolicyReference<'plugin::suggest-lab'>, 'isOwner'>>,
  // Middleware lookups and typed route middlewares list registered names in both switch states.
  Expect<Lists<MiddlewareLookupName, 'plugin::suggest-lab.timer'>>,
  Expect<Lists<MiddlewareReference, 'plugin::suggest-lab.timer'>>,
];
nameChecks satisfies unknown;

// Root lookups list registered names only with strict types: without them, they print develop's
// parameters (`tests/strict-off/lookups.ts`).
type RootLookupName<TKey extends keyof StrapiInstance> = Parameters<StrapiInstance[TKey]>[0];
declare const rootNameChecks: [
  Expect<Lists<RootLookupName<'service'>, 'plugin::suggest-lab.greeting'>>,
  Expect<Lists<RootLookupName<'controller'>, 'plugin::suggest-lab.items'>>,
  Expect<Lists<RootLookupName<'policy'>, 'plugin::suggest-lab.isOwner'>>,
  Expect<Lists<RootLookupName<'middleware'>, 'plugin::suggest-lab.timer'>>,
];
rootNameChecks satisfies unknown;

declare const strapi: StrapiInstance;
declare const dynamicName: string;

// Suggested dotted paths resolve like any other path of the contract.
const port = strapi.config.get('plugin::suggest-lab.provider.options.port');
port satisfies number | undefined;
const pluginName = strapi.plugin('suggest-lab').config('provider.name');
pluginName satisfies string;
// Suggestions do not restrict the accepted paths.
strapi.config.get('server.port') satisfies unknown;
strapi.plugin('suggest-lab').config('provider.missing') satisfies unknown;
strapi.config.get(dynamicName) satisfies unknown;

// Suggested names do not restrict the accepted names.
strapi.policy('global::unregistered') satisfies unknown;
strapi.policy(dynamicName) satisfies unknown;
strapi.middleware('global::unregistered') satisfies unknown;
strapi.middleware(dynamicName) satisfies unknown;
strapi.plugin(dynamicName) satisfies unknown;
strapi.plugin('unregistered') satisfies unknown;
strapi.api('unregistered') satisfies unknown;
const apiService = strapi.api('suggest-lab').service<{ anything(): void }>('unregistered');
apiService.anything();
const apiController = strapi.api('suggest-lab').controller<{ list(): void }>('unregistered');
apiController.list();
declare const dynamicModule: Module;
dynamicModule.service(dynamicName).anything();
// @ts-expect-error Full UID lookups keep rejecting names outside the UID pattern.
strapi.service('unnamespaced');
// @ts-expect-error Full UID lookups keep rejecting names outside the UID pattern.
strapi.controller('unnamespaced');
