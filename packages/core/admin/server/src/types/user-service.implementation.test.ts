// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { AdminUser, SanitizedAdminUser } from '../../../shared/contracts/shared';

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

declare const userService: UserService;
declare const userWithRoles: AdminUser;
// A user read without its roles, such as the `createdBy` relation that content-releases populates
// (`tests/api/core/content-releases/content-releases-service-results.test.api.ts`).
declare const userWithoutRoles: Omit<AdminUser, 'roles'>;

const sanitizeUserWithRoles = () => userService.sanitizeUser(userWithRoles);
const sanitizeUserWithoutRoles = () => userService.sanitizeUser(userWithoutRoles);

// `sanitizeUser` maps the roles only when the user has them: `roles: user.roles && …`
// (`services/user.ts`), so a user without roles keeps `roles` undefined.
export type SanitizeUserContractAssertions = [
  Expect<Equal<[ReturnType<typeof sanitizeUserWithRoles>], [SanitizedAdminUser]>>,
  Expect<
    Equal<
      [ReturnType<typeof sanitizeUserWithoutRoles>],
      [Omit<SanitizedAdminUser, 'roles'> & { roles: undefined }]
    >
  >,
];
