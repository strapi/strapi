// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Modules } from '@strapi/types';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type RoleRow<TParams> = Modules.Documents.StrictResult<'admin::role', TParams, 'published'>;
type UserRow<TParams> = Modules.Documents.StrictResult<'admin::user', TParams, 'published'>;

declare const roleService: Strapi.Registries.PackageServices['admin::role'];
declare const permissionService: Strapi.Registries.PackageServices['admin::permission'];
declare const tokenService: Strapi.Registries.PackageServices['admin::api-token-content-api'];
declare const userWithRoles: UserRow<{ populate: ['roles'] }>;
declare const userWithoutRoles: UserRow<{ populate: [] }>;

// With strict types, the registered `admin::role`, `admin::permission` and token contracts resolve
// to the rows the query engine returns (`tests/api/core/admin/admin-service-shapes.test.api.ts`).
const roleCreated = () => roleService.create({ name: 'Role' });
const roleFound = () => roleService.findOne({ id: 1 });
const roleWithPermissions = () => roleService.findOne({ id: 1 }, ['permissions']);
const roleWithUsersCount = () => roleService.findOneWithUsersCount({ id: 1 });
const permissionsFound = () => permissionService.findMany({ where: { role: { id: 1 } } });
const tokenFound = () => tokenService.getById(1);
const tokenRegenerated = () => tokenService.regenerate(1);

type Permission = Awaited<ReturnType<typeof permissionsFound>>[number];
type Token = NonNullable<Awaited<ReturnType<typeof tokenFound>>>;

export type ServiceRowAssertions = [
  Expect<Equal<[Awaited<ReturnType<typeof roleCreated>>], [RoleRow<Record<never, never>>]>>,
  Expect<Equal<[Awaited<ReturnType<typeof roleFound>>], [RoleRow<Record<never, never>> | null]>>,
  Expect<
    Equal<
      [Awaited<ReturnType<typeof roleWithPermissions>>],
      [RoleRow<{ populate: ['permissions'] }> | null]
    >
  >,
  // A role row has no relation unless the read populates it.
  Expect<Equal<['users' extends keyof RoleRow<Record<never, never>> ? true : false], [false]>>,
  Expect<
    Equal<[NonNullable<Awaited<ReturnType<typeof roleWithUsersCount>>>['usersCount']], [number]>
  >,
  // The permission domain keeps the `id`, `action`, `subject` and JSON columns, not the timestamps.
  Expect<
    Equal<
      [keyof Permission],
      ['id' | 'action' | 'subject' | 'actionParameters' | 'properties' | 'conditions']
    >
  >,
  // A token without a lifespan has no expiration date.
  Expect<Equal<[Token['expiresAt']], [string | null]>>,
  // `regenerate` selects the `id`, `name` and `kind` columns and returns the new access key.
  Expect<
    Equal<
      [keyof Awaited<ReturnType<typeof tokenRegenerated>>],
      ['id' | 'name' | 'kind' | 'accessKey']
    >
  >,
];

// A user read from the user service is accepted where the admin takes a user.
export const acceptsUserRows = async () => {
  await permissionService.engine.generateUserAbility(userWithRoles);
  await permissionService.findUserPermissions(userWithoutRoles);
  await tokenService.list(userWithRoles);
  roleService.hasSuperAdminRole(userWithRoles) satisfies boolean;
};
