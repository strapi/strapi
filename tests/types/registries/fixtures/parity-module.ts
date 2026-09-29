// Strict-off parity: `Core.Module` (`strapi.api(name)`, `strapi.apis`, `strapi.admin`) as develop apps
// use it. Compiled against develop too, so every expected error below is one develop reports.
import type { Core } from '@strapi/strapi';

declare const strapi: Core.Strapi;
declare const anyFn: (...args: any[]) => any; // `jest.fn()`-like
type MyService = { find(): Promise<string[]> };
type MyController = { index: Core.ControllerHandler };

// Mocks: a full module literal needs develop's members only, without a `policy` lookup.
const fullModule: Core.Module = {
  bootstrap() {},
  destroy() {},
  register() {},
  config: anyFn,
  routes: {},
  controllers: {},
  services: {},
  policies: {},
  middlewares: {},
  contentTypes: {},
  controller: anyFn,
  service: anyFn,
};
const moduleMock: Pick<Core.Module, 'service' | 'controller'> = {
  service: anyFn,
  controller: anyFn,
};

// Lookups take one type argument, and annotations infer it.
const fromApi = strapi.api('parity').service<MyService>('example');
const fromApiController = strapi.api('parity').controller<MyController>('example');
const fromAdmin = strapi.admin.service<MyService>('user');
// @ts-expect-error TS2558 expected 1 type argument
strapi.api('parity').service<MyService, 'example'>('example');
// @ts-expect-error TS2558 expected 1 type argument
strapi.admin.controller<MyController, 'user'>('user');
// @ts-expect-error TS2344 a string is not a service
strapi.api('parity').service<string>('example');
const annotatedService: MyService = strapi.api('parity').service('example');
const annotatedController: MyController = strapi.admin.controller('user');

// Develop has no `policy` lookup on modules.
// @ts-expect-error TS2339 no `policy` on `Core.Module`
strapi.api('parity').policy('is-owner');
// @ts-expect-error TS2339 no `policy` on `Core.Module`
strapi.admin.policy('isAuthenticatedAdmin');

// Results and maps keep the legacy types.
const api = strapi.api('parity');
api.service('example').anything();
api.controller('example').anything satisfies Core.ControllerHandler;
api.services.example.anything();
api.controllers.example.anything satisfies Core.ControllerHandler;
api.policies['is-owner'] satisfies Core.Policy;
strapi.apis.parity.service('example').anything();
const name: string = 'dynamic';
strapi.api(name).service(name).anything();
strapi.admin.service('user').anything();
strapi.admin.services.user.anything();
Object.values(strapi.apis).forEach((entry) => entry.service('x').anything());
// @ts-expect-error TS2339 modules have no index signature
api.customField satisfies unknown;

// `config` defaults widen their literal.
let moduleValue = strapi.api('parity').config('value', 'a');
moduleValue = 'b';
moduleValue satisfies string;
const moduleRaw = strapi.api('parity').config('value');
// @ts-expect-error TS18046 `unknown`
moduleRaw.toFixed();

// Modules as parameters.
const useModule = (entry: Core.Module) => entry.service('x');
useModule(strapi.api('parity'));
useModule(strapi.admin);
useModule(strapi.apis.parity);

// `ReturnType` / `Parameters` of module members.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
declare const checks: [
  Expect<Equal<Parameters<Core.Module['service']>, [name: string]>>,
  Expect<Equal<Parameters<Core.Module['controller']>, [name: string]>>,
  Expect<Equal<ReturnType<Core.Module['service']>, Core.Service>>,
  Expect<Equal<ReturnType<Core.Module['controller']>, Core.Controller>>,
];

export { fullModule, moduleMock, fromApi, fromApiController, fromAdmin };
export { annotatedService, annotatedController, checks };
