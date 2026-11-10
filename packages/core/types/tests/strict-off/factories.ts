import type { Core, UID } from '../../src';
import type { Equal, Expect } from './helpers';

// Without strict types, `Core.IsStrict` is `false` and a service factory may return any service, as
// on develop, for registered, inferred and unregistered UIDs.
type ServiceFactoryChecks = [
  Expect<Equal<Core.IsStrict, false>>,
  Expect<Equal<Core.ServiceFactoryUID, UID.Service>>,
  Expect<Equal<ReturnType<Core.ServiceFactory<'plugin::legacy.example'>>, Core.Service>>,
  Expect<Equal<ReturnType<Core.ServiceFactory<'api::unregistered.example'>>, Core.Service>>,
  Expect<Equal<ReturnType<Core.ServiceFactory<'api::legacy.inferred'>>, Core.Service>>,
];
declare const serviceFactoryChecks: ServiceFactoryChecks;
serviceFactoryChecks satisfies unknown;
(() => ({ count: () => 'any' })) satisfies Core.ServiceFactory<'plugin::legacy.example'>;
(() => ({ anything: true })) satisfies Core.ServiceFactory<'api::unregistered.example'>;

// Without strict types, a controller factory may return any object, for registered, inferred and
// unregistered UIDs. Develop has no public controller factory type, and `Core.Controller` rejects a
// core controller: the returned type has no index signature.
type ControllerFactoryChecks = [
  Expect<Equal<Core.ControllerFactoryUID, UID.Controller>>,
  Expect<Equal<ReturnType<Core.ControllerFactory<'plugin::legacy.example'>>, object>>,
  Expect<Equal<ReturnType<Core.ControllerFactory<'api::unregistered.example'>>, object>>,
  Expect<Equal<ReturnType<Core.ControllerFactory<'api::legacy.inferred'>>, object>>,
];
declare const controllerFactoryChecks: ControllerFactoryChecks;
controllerFactoryChecks satisfies unknown;
(() => ({ list: () => 'any' })) satisfies Core.ControllerFactory<'plugin::legacy.example'>;
(() => ({ anything: true })) satisfies Core.ControllerFactory<'api::unregistered.example'>;
declare const coreController: (params: {
  strapi: Core.Strapi;
}) => Core.CoreAPI.Controller.ContentType<'api::legacy.example'> & {
  titles: Core.ControllerHandler;
};
coreController satisfies Core.ControllerFactory<'api::legacy.example'>;
// @ts-expect-error `Core.Controller` needs an index signature that a core controller does not have.
coreController satisfies (params: { strapi: Core.Strapi }) => Core.Controller;
