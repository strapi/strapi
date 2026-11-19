// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Data } from '@strapi/types';
import type { queryParams } from '@strapi/utils';
import type roleService from '../services/role';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

type Implementation = typeof roleService;
type Contract = Strapi.Registries.PackageServices['admin::role'];

// With strict types, the query parameters of `findAllWithUsersCount`, `update` and `count` are not
// `any`, in the implementation and in the registered contract. `findAllWithUsersCount` takes the
// `query-params` transform keys plus the keys the transform forwards unchanged, `update` the `{ id }`
// its controller passes as the `where`, and `count` an object of query engine arguments.
export type RoleParamsImplementationAssertions = [
  Expect<Equal<[IsAny<Parameters<Implementation['findAllWithUsersCount']>[0]>], [false]>>,
  Expect<Equal<[IsAny<Parameters<Implementation['update']>[0]>], [false]>>,
  Expect<Equal<[IsAny<Parameters<Implementation['count']>[0]>], [false]>>,
  Expect<Equal<[IsAny<Parameters<Contract['findAllWithUsersCount']>[0]>], [false]>>,
  Expect<Equal<[IsAny<Parameters<Contract['update']>[0]>], [false]>>,
  Expect<Equal<[IsAny<Parameters<Contract['count']>[0]>], [false]>>,
  Expect<
    Equal<
      [Parameters<Contract['findAllWithUsersCount']>[0]],
      [queryParams.Params & Record<string, unknown>]
    >
  >,
  Expect<Equal<[Parameters<Contract['update']>[0]], [{ id: Data.ID }]>>,
  Expect<Equal<[Parameters<Contract['count']>[0]], [Record<string, unknown> | undefined]>>,
];
