/**
 * Type-level tests of the `Strapi` class's own container lookups (`this.get(name)`), compiled by
 * `yarn test:ts` (tsc -p tsconfig.json, strict types on) and excluded from the build. The class
 * resolves a name like `Core.Strapi['get']`: through `Strapi.Registries.ContainerEntries`.
 */
import type { Core, Modules } from '@strapi/types';

import type Strapi from '../Strapi';

// Operands wrapped in a tuple: TypeScript's error type (an unresolved type, printed as `any`)
// would otherwise make the comparison true for any other operand.
type Equal<T, U> =
  (<V>() => V extends [T] ? 1 : 2) extends <V>() => V extends [U] ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

const lookups = (strapi: Strapi, name: string) => ({
  db: strapi.get('db'),
  hooks: strapi.get('hooks'),
  config: strapi.get('config'),
  services: strapi.get('services'),
  modules: strapi.get('modules'),
  unregistered: strapi.get('plugin-x.thing'),
  dynamic: strapi.get(name),
  explicit: strapi.get<{ run(): void }>('plugin-x.thing'),
});

type Lookups = ReturnType<typeof lookups>;

export type StrapiContainerLookups = [
  // Not `Equal`: the class `get` has no `NoInfer`, which TypeScript cannot relate (see `Container.get`).
  Expect<Strapi['get'] extends Core.Strapi['get'] ? true : false>,
  Expect<Equal<IsAny<Lookups['db']>, false>>,
  Expect<Equal<Lookups['db'], Modules.Lifecycles.StrictDatabase>>,
  Expect<Equal<Lookups['hooks'], Core.StrictHooksRegistry>>,
  Expect<Equal<Lookups['config'], Core.ConfigProvider>>,
  Expect<Equal<Lookups['services'], Core.ServicesRegistry>>,
  Expect<Equal<Lookups['modules'], Core.ModulesRegistry>>,
  Expect<Equal<Lookups['unregistered'], unknown>>,
  Expect<Equal<Lookups['dynamic'], unknown>>,
  Expect<Equal<Lookups['explicit'], { run(): void }>>,
];
