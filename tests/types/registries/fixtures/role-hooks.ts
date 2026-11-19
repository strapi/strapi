import type { Core } from '@strapi/strapi';

type IsAny<T> = 0 extends 1 & T ? true : false;
type Expect<T extends true> = T;

declare const app: Core.Strapi;

const { hooks } = app.service('admin::role');

type RolePermissionsHandler = Parameters<
  (typeof hooks)['willResetSuperAdminPermissions']['register']
>[0];
type RolePermission = Parameters<RolePermissionsHandler>[0][number];

// The handlers of the role permissions hooks receive and resolve to role permissions, never `any`.
declare const typed: [
  Expect<IsAny<Parameters<RolePermissionsHandler>[0]> extends false ? true : false>,
  Expect<IsAny<RolePermission['properties']> extends false ? true : false>,
];
typed satisfies unknown;

// A handler reads the permissions it receives.
hooks.willResetSuperAdminPermissions.register(async (permissions) =>
  permissions.map((permission) => {
    permission.action satisfies string;
    permission.subject satisfies string | null | undefined;
    permission.conditions satisfies string[];
    permission.properties.locales satisfies string[] | null | undefined;

    return { ...permission, properties: { ...permission.properties, locales: ['en'] } };
  })
);
hooks.willValidateUpdatePermissions.register((permissions) => permissions);
hooks.willCreateDefaultRolePermissions.register((permissions) => permissions.slice(1));

// A handler resolves to the permissions the next handler receives.
// @ts-expect-error A handler that resolves to no permissions breaks the next handler.
hooks.willValidateUpdatePermissions.register(async () => undefined);
// @ts-expect-error The handler receives a list of permissions, not one permission.
hooks.willCreateDefaultRolePermissions.register((permission: { action: number }) => [permission]);

// `call` takes the permissions the handlers receive and resolves to what they resolve to.
void hooks.willResetSuperAdminPermissions
  .call([{ action: 'plugin::example.read', subject: null, properties: {}, conditions: [] }])
  .then((permissions) => permissions satisfies RolePermission[]);
// @ts-expect-error `call` takes a list of permissions.
void hooks.willValidateUpdatePermissions.call('plugin::example.read');
