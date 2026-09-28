import type { Controller, ControllerFor, ControllerHandler } from '../controller';
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
      interface PackageControllers {
        'plugin::controller-lab.items': { list: ControllerHandler; defaultOnly: ControllerHandler };
        'plugin::controller-lab.tags': LabController;
      }

      interface AppControllers {
        'plugin::controller-lab.items': LabController;
        'api::controller-lab.items': LabController;
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const dynamicPlugin: string;
declare const dynamicController: string;
declare const patternController: `items-${string}`;
declare const wideController: ControllerFor<string>;
declare const patternUid: `plugin::${string}.items`;

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

/** `true` only for `unknown`: `any` and every other type give `false`. */
declare function exactlyUnknown<T>(
  value: T
): [unknown] extends [T] ? (0 extends 1 & T ? false : true) : false;

// Unregistered names resolve to `unknown`, for full UIDs and plugin-scoped lookups alike.
// Callers pass a type argument to use them.
exactlyUnknown(strapi.controller('plugin::unregistered.items')) satisfies true;
exactlyUnknown(strapi.controller('api::unregistered.items')) satisfies true;
exactlyUnknown(strapi.plugin('controller-lab').controller('unregistered')) satisfies true;
exactlyUnknown(strapi.plugin('unregistered').controller('items')) satisfies true;
// @ts-expect-error Unregistered literal names expose no actions.
strapi.controller('plugin::unregistered.items').anything satisfies unknown;

// Dynamic names cannot be validated, so they resolve to `unknown` too.
exactlyUnknown(wideController) satisfies true;
exactlyUnknown(strapi.controller(patternUid)) satisfies true;
exactlyUnknown(strapi.plugin(dynamicPlugin).controller('items')) satisfies true;
exactlyUnknown(strapi.plugin('controller-lab').controller(dynamicController)) satisfies true;
exactlyUnknown(strapi.plugin('controller-lab').controller(patternController)) satisfies true;

// Explicitly typed lookups use the type argument.
strapi.plugin('controller-lab').controller<LabController>('items').list satisfies ControllerHandler;
strapi.plugin('unregistered').controller<LabController>('items').list satisfies ControllerHandler;
strapi.controller<LabController>('plugin::unregistered.items').list satisfies ControllerHandler;
strapi.controller<LabController>('api::unregistered.items').create satisfies ControllerHandler;
// The explicit generic wins over a registered contract.
strapi.controller<LabController>('plugin::controller-lab.items').create satisfies ControllerHandler;
// @ts-expect-error The explicit contract is not widened by the permissive controller index signature.
strapi.controller<LabController>('plugin::unregistered.items').missing satisfies unknown;
const legacyPlugin: Plugin = strapi.plugin('controller-lab');
exactlyUnknown(legacyPlugin.controller('items')) satisfies true;
// @ts-expect-error A type annotation on the result does not replace the type argument.
const contextualController: Controller = legacyPlugin.controller('items');
contextualController satisfies unknown;

// Generic helpers that forward a controller name pass their return type as the type argument.
type LabControllers = { items: LabController; unregistered: LabController };
const getUnregisteredController = <TName extends keyof LabControllers>(
  name: TName
): LabControllers[TName] => strapi.plugin('unregistered').controller<LabControllers[TName]>(name);
getUnregisteredController('items').list satisfies ControllerHandler;

// @ts-expect-error Assigned functions are checked against the generic signature, as before registries.
legacyPlugin.controller = () => ({ list: () => undefined });

// API module lookups resolve registered names relative to the API, like plugin lookups.
strapi.api('controller-lab').controller('items') satisfies LabController;
// @ts-expect-error API lookups reject nonexistent actions.
strapi.api('controller-lab').controller('items').missing satisfies unknown;
exactlyUnknown(strapi.api('controller-lab').controller('unregistered')) satisfies true;
exactlyUnknown(strapi.api('unregistered').controller('items')) satisfies true;
exactlyUnknown(strapi.api('controller-lab').controller(dynamicController)) satisfies true;
exactlyUnknown(strapi.api(dynamicPlugin).controller('items')) satisfies true;
strapi.api('unregistered').controller<LabController>('items').list satisfies ControllerHandler;
// @ts-expect-error `T` is not inferred from the annotation, for API lookups either.
const contextualApi: LabController = strapi.api('controller-lab').controller('unregistered');
contextualApi satisfies unknown;
