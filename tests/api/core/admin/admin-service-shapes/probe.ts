/**
 * The admin service calls an application makes, as it writes them with strict types. The API test
 * runs `probeAdminServices` against a running instance and compares the shape of each result with
 * the type of the variable of the same name (`tests/api/utils/shapes.ts`). Each result is a named
 * `const`: the comparison reads its type by name.
 */
import type {} from '@strapi/strapi/strict-types';
import type { Core } from '@strapi/strapi';

/** The names of the results, as `probeAdminServices` returns them. */
export const resultNames = [
  'roleCreated',
  'roleFound',
  'roleFoundWithPermissions',
  'roleFoundWithUsersCount',
  'rolesFound',
  'rolesWithUsersCount',
  'roleUpdated',
  'superAdminRole',
  'superAdminRoleWithUsersCount',
  'permissionsAssigned',
  'permissionsFound',
  'userCreated',
  'userFound',
  'userFoundWithoutRoles',
  'userFoundByEmail',
  'userUpdated',
  'userSanitized',
  'userSanitizedWithoutRoles',
  'tokenCreated',
  'tokenFound',
  'tokensListed',
  'tokenRegenerated',
  'tokenRevoked',
  'userDeleted',
  'usersDeleted',
  'rolesDeleted',
] as const;

export const probeAdminServices = async (strapi: Core.Strapi, stamp: string) => {
  const roleService = strapi.service('admin::role');
  const userService = strapi.service('admin::user');
  const permissionService = strapi.service('admin::permission');
  const tokenService = strapi.service('admin::api-token');

  const roleCreated = await roleService.create({
    name: `Shapes ${stamp}`,
    description: 'A role of the shape comparison',
  });
  const permissionsAssigned = await roleService.assignPermissions(roleCreated.id, [
    { action: 'plugin::content-manager.explorer.read', subject: 'admin::user', conditions: [] },
  ]);
  const roleFound = await roleService.findOne({ id: roleCreated.id });
  const roleFoundWithPermissions = await roleService.findOne({ id: roleCreated.id }, [
    'permissions',
  ]);
  const roleFoundWithUsersCount = await roleService.findOneWithUsersCount({ id: roleCreated.id });
  const rolesFound = await roleService.find({ id: roleCreated.id }, []);
  const rolesWithUsersCount = await roleService.findAllWithUsersCount({
    filters: { id: roleCreated.id },
  });
  const roleUpdated = await roleService.update(
    { id: roleCreated.id },
    { description: 'An updated role of the shape comparison' }
  );
  const superAdminRole = await roleService.getSuperAdmin();
  const superAdminRoleWithUsersCount = await roleService.getSuperAdminWithUsersCount();
  const permissionsFound = await permissionService.findMany({
    where: { role: { id: roleCreated.id } },
  });

  const email = `shapes-${stamp}@example.com`;
  const userCreated = await userService.create({
    email,
    firstname: 'Shapes',
    lastname: 'User',
    password: 'Password123',
    roles: [roleCreated.id],
    isActive: true,
  });
  const otherUser = await userService.create({
    email: `shapes-other-${stamp}@example.com`,
    firstname: 'Shapes',
    lastname: 'Other',
    roles: [roleCreated.id],
  });
  const userFound = await userService.findOne(userCreated.id);
  const userFoundWithoutRoles = await userService.findOne(userCreated.id, []);
  const userFoundByEmail = await userService.findOneByEmail(email);
  const userUpdated = await userService.updateById(userCreated.id, { firstname: 'Updated' });
  const userSanitized = userFound === null ? null : userService.sanitizeUser(userFound);
  const userSanitizedWithoutRoles =
    userFoundByEmail === null ? null : userService.sanitizeUser(userFoundByEmail);
  // A user read from the service is accepted where the admin takes a user.
  if (userFound !== null) {
    await permissionService.engine.generateUserAbility(userFound);
    await permissionService.findUserPermissions(userFound);
    roleService.hasSuperAdminRole(userFound) satisfies boolean;
  }

  const tokenCreated = await tokenService.create({
    name: `shapes-${stamp}`,
    description: 'A token of the shape comparison',
    type: 'read-only',
    lifespan: null,
  });
  const tokenFound = await tokenService.getById(tokenCreated.id);
  const tokensListed = userFound === null ? [] : await tokenService.list(userFound);
  const tokenRegenerated = await tokenService.regenerate(tokenCreated.id);
  const tokenRevoked = await tokenService.revoke(tokenCreated.id);

  const userDeleted = await userService.deleteById(userCreated.id);
  const usersDeleted = await userService.deleteByIds([otherUser.id]);
  const rolesDeleted = await roleService.deleteByIds([roleCreated.id]);

  return {
    roleCreated,
    roleFound,
    roleFoundWithPermissions,
    roleFoundWithUsersCount,
    rolesFound,
    rolesWithUsersCount,
    roleUpdated,
    superAdminRole,
    superAdminRoleWithUsersCount,
    permissionsAssigned,
    permissionsFound,
    userCreated,
    userFound,
    userFoundWithoutRoles,
    userFoundByEmail,
    userUpdated,
    userSanitized,
    userSanitizedWithoutRoles,
    tokenCreated,
    tokenFound,
    tokensListed,
    tokenRegenerated,
    tokenRevoked,
    userDeleted,
    usersDeleted,
    rolesDeleted,
  } satisfies Record<(typeof resultNames)[number], unknown>;
};
