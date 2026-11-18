import type {} from '@strapi/strapi';
import type {} from '@strapi/admin/strapi-server';

type RoleHooks = Strapi.Registries.PackageServices['admin::role']['hooks'];
declare const hooks: RoleHooks;

// Without strict types, the role permissions hooks keep develop's signatures: any handler and any
// context are accepted.
hooks.willResetSuperAdminPermissions.register(async (permissions: number) => `${permissions}`);
hooks.willValidateUpdatePermissions.register(async () => undefined);
hooks.willCreateDefaultRolePermissions.register((permission: { action: number }) => [permission]);
void hooks.willValidateUpdatePermissions
  .call('plugin::example.read')
  .then((result) => result satisfies unknown);
