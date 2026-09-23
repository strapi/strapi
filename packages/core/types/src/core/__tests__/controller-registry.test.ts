import type { Controller, ControllerHandler } from '../controller';
import type { Plugin } from '../plugin';
import type { Strapi as StrapiInstance } from '../strapi';

type LabController = {
  list: ControllerHandler;
  create: ControllerHandler;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultControllers {
        'plugin::controller-lab.items': { list: ControllerHandler; defaultOnly: ControllerHandler };
        'plugin::controller-lab.tags': LabController;
      }

      interface Controllers {
        'plugin::controller-lab.items': LabController;
        'api::controller-lab.items': LabController;
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const dynamicPlugin: string;
declare const dynamicController: string;

// Full UID and plugin-scoped lookups resolve the registered contract.
strapi.controller('plugin::controller-lab.items') satisfies LabController;
strapi.controller('api::controller-lab.items').create satisfies ControllerHandler;
strapi.plugin('controller-lab').controller('items') satisfies LabController;
strapi.plugin('controller-lab').controller('tags').list satisfies ControllerHandler;
// @ts-expect-error Registered contracts reject nonexistent actions.
strapi.controller('plugin::controller-lab.items').missing satisfies unknown;
// @ts-expect-error Plugin-scoped lookups reject nonexistent actions.
strapi.plugin('controller-lab').controller('tags').missing satisfies unknown;

// An override replaces the default contract rather than intersecting it.
// @ts-expect-error Actions from the replaced default are not retained.
strapi.plugin('controller-lab').controller('items').defaultOnly satisfies unknown;

// Unregistered, dynamic and explicitly typed lookups keep the permissive signature.
strapi.controller('plugin::unregistered.items').anything satisfies ControllerHandler;
strapi.plugin('controller-lab').controller('unregistered').anything satisfies ControllerHandler;
strapi.plugin(dynamicPlugin).controller('items').anything satisfies ControllerHandler;
strapi.plugin('controller-lab').controller(dynamicController).anything satisfies ControllerHandler;
strapi.plugin('controller-lab').controller<LabController>('items').list satisfies ControllerHandler;
const legacyPlugin: Plugin = strapi.plugin('controller-lab');
legacyPlugin.controller('items') satisfies Controller;

// Generic helpers that forward a controller name keep inferring from their declared return type.
type LabControllers = { items: LabController; unregistered: LabController };
const getUnregisteredController = <TName extends keyof LabControllers>(
  name: TName
): LabControllers[TName] => strapi.plugin('unregistered').controller(name);
getUnregisteredController('items').list satisfies ControllerHandler;

// @ts-expect-error Assigned functions are checked against the generic signature, as before registries.
legacyPlugin.controller = () => ({ list: () => undefined });
