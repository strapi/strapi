// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createActionProvider from '../domain/action/provider';
import type createConditionProvider from '../domain/condition/provider';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type ActionProviderImplementation = ReturnType<typeof createActionProvider>;
type ConditionProviderImplementation = ReturnType<typeof createConditionProvider>;

type PermissionService = Strapi.Registries.PackageServices['admin::permission'];
type ActionProvider = PermissionService['actionProvider'];
type ConditionProvider = PermissionService['conditionProvider'];

// Both providers end `registerMany` with `return this`: it resolves to the provider it was called on.
export type ProviderImplementationAssertions = [
  Expect<
    Equal<
      [Awaited<ReturnType<ActionProviderImplementation['registerMany']>>],
      [ActionProviderImplementation]
    >
  >,
  Expect<
    Equal<
      [Awaited<ReturnType<ConditionProviderImplementation['registerMany']>>],
      [ConditionProviderImplementation]
    >
  >,
];

// With strict types, the registered `admin::permission` contract names that result, so the published
// declarations do not print it as `any`.
export type ProviderContractAssertions = [
  Expect<Equal<[Awaited<ReturnType<ActionProvider['registerMany']>>], [ActionProvider]>>,
  Expect<Equal<[Awaited<ReturnType<ConditionProvider['registerMany']>>], [ConditionProvider]>>,
  Expect<Equal<['register' extends keyof ConditionProvider ? true : false], [true]>>,
];
