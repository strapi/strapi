import type * as UID from '../../uid';
import type { ControllerLookupUID } from '../controller';
import type { Module } from '../module';
import type { PolicyReference } from '../policy';
import type { ServiceLookupUID } from '../service';
import type { ConfigPathSuggestion, Strapi as StrapiInstance } from '../strapi';

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

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type Includes<TUnion, TMember> = TMember extends TUnion ? true : false;

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
  Expect<Includes<ServiceLookupUID, 'plugin::suggest-lab.greeting'>>,
  Expect<Includes<ServiceLookupUID, 'api::suggest-lab.greeting'>>,
  Expect<Includes<ServiceLookupUID, UID.Service>>,
  Expect<Includes<ControllerLookupUID, 'plugin::suggest-lab.items'>>,
  Expect<Includes<ControllerLookupUID, UID.Controller>>,
  // Typed route policies list registered names in both switch states.
  Expect<Includes<PolicyReference, 'plugin::suggest-lab.isOwner'>>,
  Expect<Includes<PolicyReference<'plugin::suggest-lab'>, 'isOwner'>>,
];
nameChecks satisfies unknown;

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

// Suggested names do not restrict the accepted names, and keep the legacy results.
strapi.policy('global::unregistered') satisfies unknown;
strapi.policy(dynamicName) satisfies unknown;
strapi.plugin(dynamicName) satisfies unknown;
strapi.plugin('unregistered') satisfies unknown;
strapi.api('unregistered') satisfies unknown;
const apiService = strapi.api('suggest-lab').service('greeting');
apiService.anything();
const apiController = strapi.api('suggest-lab').controller<{ list(): void }>('unregistered');
apiController.list();
declare const dynamicModule: Module;
dynamicModule.service(dynamicName).anything();
// @ts-expect-error Full UID lookups keep rejecting names outside the UID pattern.
strapi.service('unnamespaced');
// @ts-expect-error Full UID lookups keep rejecting names outside the UID pattern.
strapi.controller('unnamespaced');
