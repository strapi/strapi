import type { PropertyPath } from 'lodash';
import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppConfigs {
        'api::legacy': { limit: number };
      }
    }
  }
}

declare const moduleStrapi: Core.Strapi;

// Module config keeps develop's signature, even for an API with a registered config contract.
type DevelopModuleConfig = <T = unknown>(key: PropertyPath, defaultVal?: T) => T;
const apiLimit = moduleStrapi.api('legacy').config('limit');
const apiLabel = moduleStrapi.api('legacy').config('label', 'fallback');
declare const moduleConfigChecks: [
  Expect<Equal<Core.Module['config'], DevelopModuleConfig>>,
  Expect<Equal<Core.ModuleOf<'api::legacy'>['config'], DevelopModuleConfig>>,
  Expect<Equal<ReturnType<Core.Strapi['api']>['config'], DevelopModuleConfig>>,
  Expect<Equal<typeof apiLimit, unknown>>,
  Expect<Equal<typeof apiLabel, 'fallback'>>,
];
moduleConfigChecks satisfies unknown;

// `Module` and `Plugin` are not generic, so they print bare as on develop (`ModuleOf` and
// `PluginOf` take the name). Both keep develop's members.
// @ts-expect-error `Module` takes no type argument, as on develop.
declare const genericModule: Core.Module<'api::legacy'>;
// @ts-expect-error `Plugin` takes no type argument, as on develop.
declare const genericPlugin: Core.Plugin<'legacy'>;
[genericModule, genericPlugin] satisfies unknown[];
declare const bareChecks: [
  Expect<Equal<Core.Module, Core.ModuleOf<string>>>,
  Expect<Equal<Core.Plugin, Core.PluginOf<string>>>,
  Expect<Equal<ReturnType<Core.Strapi['api']>, Core.Module>>,
  Expect<Equal<ReturnType<Core.Strapi['plugin']>, Core.Plugin>>,
  Expect<Equal<Core.Strapi['admin'], Core.Module>>,
];
bareChecks satisfies unknown;
