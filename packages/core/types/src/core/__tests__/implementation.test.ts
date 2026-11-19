import type * as Core from '..';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type ExampleService = {
  f(a: string, b?: number): Promise<number>;
  n: number;
};

// A licensed entry (`Contract | undefined`) is pinned by the strict-off program: registering one
// here would add `undefined` to the service maps of every registry test of this program.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::probe.example': ExampleService;
      }
    }
  }
}

// With strict types, an implementation is checked against the contract itself.
type ImplementsChecks = [
  Expect<Equal<Core.Implements<ExampleService>, ExampleService>>,
  Expect<Equal<Core.Implements<ExampleService['f']>, ExampleService['f']>>,
  Expect<Equal<ReturnType<Core.ServiceImplementation<'plugin::probe.example'>>, ExampleService>>,
  Expect<
    Equal<
      Parameters<Core.ServiceImplementation<'plugin::probe.example'>>,
      [params: { strapi: Core.Strapi }]
    >
  >,
];
declare const implementsChecks: ImplementsChecks;
implementsChecks satisfies unknown;
// Unannotated parameters take the contract's types. An optional parameter stays optional only when
// the implementation marks it (`b?`): `(a, b)` reads `b` as `number | undefined`, but requires it.
const factory = (({ strapi }: { strapi: Core.Strapi }) => ({
  async f(a, b?) {
    strapi satisfies Core.Strapi;
    return a.length + (b ?? 0);
  },
  n: 1,
})) satisfies Core.ServiceImplementation<'plugin::probe.example'>;

const formatter = ((a, b) => Promise.resolve(a.length + (b ?? 0))) satisfies Core.Implements<
  ExampleService['f']
>;

type ParameterChecks = [
  Expect<Equal<Parameters<ReturnType<typeof factory>['f']>, Parameters<ExampleService['f']>>>,
  Expect<Equal<Parameters<typeof formatter>, [a: string, b: number | undefined]>>,
];
declare const parameterChecks: ParameterChecks;
parameterChecks satisfies unknown;

({
  async f() {
    return 1;
  },
  n: 1,
  // @ts-expect-error An object implementation has no member that its contract lacks.
  extra: true,
}) satisfies Core.Implements<ExampleService>;

// An object literal returned by a factory is not checked for extra members: TypeScript compares the
// factory's inferred result, which is no longer a fresh literal. Missing members are still errors.
(() => ({
  async f() {
    return 1;
  },
  n: 1,
  extra: true,
})) satisfies Core.ServiceImplementation<'plugin::probe.example'>;

// @ts-expect-error A factory implements every member of its contract.
(() => ({
  async f() {
    return 1;
  },
})) satisfies Core.ServiceImplementation<'plugin::probe.example'>;

(() => ({
  // @ts-expect-error A member's result is the contract's result.
  async f() {
    return 'one';
  },
  n: 1,
})) satisfies Core.ServiceImplementation<'plugin::probe.example'>;

// @ts-expect-error A function's result is the contract's result.
(() => Promise.resolve('one')) satisfies Core.Implements<ExampleService['f']>;
