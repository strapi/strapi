import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

type ExampleService = {
  f(a: string, b?: number): Promise<number>;
  n: number;
};

// Without strict types, an implementation is checked against the contract's member names only:
// parameters and results are `any`, so the emitted declaration keeps the implementation's own types.
type ImplementsChecks = [
  Expect<Equal<Core.IsStrict, false>>,
  Expect<Equal<Core.Implements<ExampleService>, { f: (a: any, b?: any) => any; n: any }>>,
  Expect<Equal<Core.Implements<ExampleService['f']>, (a: any, b?: any) => any>>,
  Expect<
    Equal<ReturnType<Core.ServiceImplementation<'plugin::legacy.example'>>, { count: () => any }>
  >,
  // A licensed entry is checked against the contract it wraps.
  Expect<
    Equal<ReturnType<Core.ServiceImplementation<'plugin::legacy.licensed'>>, { count: () => any }>
  >,
  // `Core.ServiceFactory` keeps its develop result.
  Expect<Equal<ReturnType<Core.ServiceFactory<'plugin::legacy.example'>>, Core.Service>>,
];
declare const implementsChecks: ImplementsChecks;
implementsChecks satisfies unknown;

// Unannotated parameters compile (no TS7006) and stay `any`; results keep their inferred type.
const factory = (({ strapi }: { strapi: Core.Strapi }) => ({
  count() {
    strapi satisfies Core.Strapi;
    return 'any';
  },
})) satisfies Core.ServiceImplementation<'plugin::legacy.example'>;

const formatter = ((a, b) => [a, b] as const) satisfies Core.Implements<ExampleService['f']>;

type InferredChecks = [
  Expect<Equal<ReturnType<ReturnType<typeof factory>['count']>, string>>,
  Expect<Equal<Parameters<typeof formatter>, [a: any, b: any]>>,
];
declare const inferredChecks: InferredChecks;
inferredChecks satisfies unknown;

({
  f: () => 1,
  n: 1,
  // @ts-expect-error An object implementation has no member that its contract lacks.
  extra: true,
}) satisfies Core.Implements<ExampleService>;

// @ts-expect-error A factory implements every member of its contract.
(() => ({})) satisfies Core.ServiceImplementation<'plugin::legacy.example'>;
