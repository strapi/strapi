// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { AdminUser } from '../../../shared/contracts/shared';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type UserService = Strapi.Registries.PackageServices['admin::user'];

// With strict types, the registered `admin::user` contract resolves the `strapi.db.query` results
// that `tests/api/core/admin/admin-user-service-results.test.api.ts` records, in CE and EE.
export type UserServiceContractAssertions = [
  Expect<Equal<[Awaited<ReturnType<UserService['findOne']>>], [AdminUser | null]>>,
  Expect<
    Equal<[Awaited<ReturnType<UserService['findOneByEmail']>>], [Omit<AdminUser, 'roles'> | null]>
  >,
  Expect<Equal<[Awaited<ReturnType<UserService['updateById']>>], [AdminUser | null]>>,
  Expect<Equal<[Awaited<ReturnType<UserService['deleteById']>>], [AdminUser | null]>>,
  Expect<Equal<[Awaited<ReturnType<UserService['deleteByIds']>>], [AdminUser[]]>>,
];
