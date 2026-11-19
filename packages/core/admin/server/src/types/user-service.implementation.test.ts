// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Modules } from '@strapi/types';
import type { AdminUser } from '../../../shared/contracts/shared';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type UserService = Strapi.Registries.PackageServices['admin::user'];

/** An `admin::user` row read with `TParams`, as `strapi.documents('admin::user')` types it. */
type Row<TParams> = Modules.Documents.StrictResult<'admin::user', TParams, 'published'>;
type UserWithRoles = Row<{ populate: ['roles'] }>;

declare const userService: UserService;
declare const developUser: AdminUser;

// With strict types, the registered `admin::user` contract resolves to the rows the query engine
// returns, with the relations each call populates, in CE and EE
// (`tests/api/core/admin/admin-service-shapes.test.api.ts`).
const created = () => userService.create({ email: 'a@b.c' });
const found = () => userService.findOne(1);
const foundWithoutRoles = () => userService.findOne(1, []);
const foundByEmail = () => userService.findOneByEmail('a@b.c');
const foundByEmailWithRoles = () => userService.findOneByEmail('a@b.c', ['roles']);
const updated = () => userService.updateById(1, {});
const deleted = () => userService.deleteById(1);
const deletedMany = () => userService.deleteByIds([1]);

type Found = NonNullable<Awaited<ReturnType<typeof found>>>;
type FoundWithoutRoles = NonNullable<Awaited<ReturnType<typeof foundWithoutRoles>>>;

export type UserServiceContractAssertions = [
  Expect<Equal<[Awaited<ReturnType<typeof created>>], [UserWithRoles]>>,
  Expect<Equal<[Awaited<ReturnType<typeof found>>], [UserWithRoles | null]>>,
  Expect<Equal<[Awaited<ReturnType<typeof foundByEmail>>], [Row<{ populate: [] }> | null]>>,
  Expect<Equal<[Awaited<ReturnType<typeof foundByEmailWithRoles>>], [UserWithRoles | null]>>,
  Expect<Equal<[Awaited<ReturnType<typeof updated>>], [UserWithRoles | null]>>,
  Expect<Equal<[Awaited<ReturnType<typeof deleted>>], [UserWithRoles | null]>>,
  Expect<Equal<[Awaited<ReturnType<typeof deletedMany>>], [UserWithRoles[]]>>,
  // Only the populated relations are present, and every column may be `null`.
  Expect<Equal<['roles' extends keyof Found ? true : false], [true]>>,
  Expect<Equal<['roles' extends keyof FoundWithoutRoles ? true : false], [false]>>,
  Expect<Equal<['createdBy' extends keyof Found ? true : false], [false]>>,
  Expect<Equal<[Found['username']], [string | null]>>,
  Expect<Equal<[Found['preferedLanguage']], [string | null]>>,
];

// `sanitizeUser` removes the private fields, and maps the roles only when the user has them:
// `roles: user.roles && …` (`services/user.ts`), so a user without roles keeps `roles` undefined.
const sanitizedRow = (user: Found) => userService.sanitizeUser(user);
const sanitizedRowWithoutRoles = (user: FoundWithoutRoles) => userService.sanitizeUser(user);
const sanitizedDevelopUser = () => userService.sanitizeUser(developUser);
type SanitizedRow = ReturnType<typeof sanitizedRow>;

export type SanitizeUserContractAssertions = [
  Expect<
    Equal<
      [Extract<keyof SanitizedRow, 'password' | 'resetPasswordToken' | 'registrationToken'>],
      [never]
    >
  >,
  Expect<Equal<[keyof SanitizedRow['roles'][number]], ['id' | 'name' | 'description' | 'code']>>,
  Expect<Equal<[ReturnType<typeof sanitizedRowWithoutRoles>['roles']], [undefined]>>,
  // A user typed with develop's `AdminUser`, such as `ctx.state.user`, is accepted too.
  Expect<
    Equal<
      [keyof ReturnType<typeof sanitizedDevelopUser>['roles'][number]],
      ['id' | 'name' | 'code' | 'description']
    >
  >,
];
