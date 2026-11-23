// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Modules } from '@strapi/types';
import type { CreatePermissionPayload } from '../domain/permission';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type Contract = Strapi.Registries.PackageServices['admin::role'];
type UserRow<TParams> = Modules.Documents.StrictResult<'admin::user', TParams, 'published'>;

declare const roleService: Contract;
declare const permissionService: Strapi.Registries.PackageServices['admin::permission'];
declare const userWithRoles: UserRow<{ populate: ['roles'] }>;
declare const userWithoutRoles: UserRow<{ populate: [] }>;

// With strict types, `assignPermissions` takes the permissions `permissionDomain.create` takes
// (`services/role.ts`), such as the permissions with `properties` the role controller passes.
export const assignedWithProperties = () =>
  roleService.assignPermissions(1, [
    {
      action: 'plugin::content-manager.explorer.read',
      subject: 'api::article.article',
      properties: { fields: ['title'] },
      conditions: [],
    },
  ]);

export const assignedUnknownKey = () =>
  // @ts-expect-error `unknownKey` is not a key of a permission.
  roleService.assignPermissions(1, [{ action: 'a', unknownKey: 1 }]);

export const assignedWithoutAction = () =>
  // @ts-expect-error A permission has an `action`.
  roleService.assignPermissions(1, [{ subject: 'api::a.a' }]);

// The ceiling requester and the token ability owner take a user the user service returns, like
// `hasSuperAdminRole` and `generateUserAbility`: the ceiling reads the user's `id` and roles, and the
// engine hands the owner to the conditions.
export const ceilingOfUser = () =>
  roleService.checkPermissionsCeiling({ user: userWithRoles }, 1, []);
export const ceilingOfUserWithoutRoles = () =>
  roleService.checkPermissionsCeiling({ user: userWithoutRoles }, 1, []);
export const ceilingOfToken = () =>
  roleService.checkPermissionsCeiling({ tokenPermissions: [], owner: userWithRoles }, 1, []);
export const tokenAbility = () => permissionService.engine.generateTokenAbility([], userWithRoles);

// @ts-expect-error A requester is a user or a token with its owner, not an id.
export const ceilingOfId = () => roleService.checkPermissionsCeiling({ user: 1 }, 1, []);

export type RolePermissionsContractAssertions = [
  Expect<
    Equal<
      [Parameters<Contract['assignPermissions']>[1]],
      [readonly CreatePermissionPayload[] | undefined]
    >
  >,
  Expect<Equal<[Awaited<ReturnType<typeof ceilingOfUser>>], [CreatePermissionPayload[]]>>,
];
