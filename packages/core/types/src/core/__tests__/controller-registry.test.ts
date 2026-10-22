import type {
  Controller,
  ControllerFactory,
  ControllerFactoryUID,
  ControllerFor,
  ControllerHandler,
} from '../controller';
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
        'api::controller-lab.inferred': { ping: ControllerHandler };
        // Outside the UID pattern: runtime never registers a controller under this name.
        'not-a-uid': LabController;
      }

      interface InferredControllers {
        'api::controller-lab.inferred': true;
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

// @ts-expect-error A registry key outside the UID pattern is not a registered UID.
strapi.controller('not-a-uid');

// `ControllerFactory` checks a factory against the registered contract, application overrides first.
(({ strapi: instance }) => ({
  list: async () => instance.config.get('server.host', 'localhost'),
  create: () => undefined,
})) satisfies ControllerFactory<'api::controller-lab.items'>;
(() => ({
  list: () => undefined,
  create: () => undefined,
})) satisfies ControllerFactory<'plugin::controller-lab.tags'>;
// @ts-expect-error The factory must implement every action of the contract.
(() => ({ list: () => undefined })) satisfies ControllerFactory<'api::controller-lab.items'>;
(() => ({
  // @ts-expect-error Each action must be a controller handler.
  list: 'list',
  create: () => undefined,
})) satisfies ControllerFactory<'api::controller-lab.items'>;
// @ts-expect-error The application override replaces the package contract.
(() => ({
  list: () => undefined,
  defaultOnly: () => undefined,
})) satisfies ControllerFactory<'plugin::controller-lab.items'>;
// @ts-expect-error A UID without a contract cannot check a factory.
(() => ({})) satisfies ControllerFactory<'api::controller-lab.unregistered'>;
// @ts-expect-error Names outside the UID pattern are not controllers.
(() => ({})) satisfies ControllerFactory<'not-a-uid'>;

// A UID registered with the type its module provides keeps its lookup, but cannot check a factory:
// that type is read from the factory being checked.
strapi.controller('api::controller-lab.inferred').ping satisfies ControllerHandler;
declare const inferredFactoryUID: Extract<ControllerFactoryUID, 'api::controller-lab.inferred'>;
inferredFactoryUID satisfies never;
// @ts-expect-error An inferred UID cannot check a factory, even one that provides its type.
(() => ({ ping: () => undefined })) satisfies ControllerFactory<'api::controller-lab.inferred'>;
