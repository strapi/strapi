import type { Core } from '@strapi/strapi';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PermissionActions {
        'plugin::example.read': true;
      }
    }
  }
}

declare const app: Core.Strapi;
declare const category: string | undefined;
declare const dynamicId: string;

const { actionProvider } = app.service('admin::permission');

// An optional field passed through as `undefined` compiles under `exactOptionalPropertyTypes`.
actionProvider.registerMany([
  { uid: 'read', section: 'plugins', displayName: 'Read', pluginName: 'example', category },
]);

// An `as const` list, nested arrays included, is accepted once its IDs are declared.
const actions = [
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'read',
    pluginName: 'example',
    options: { applyToProperties: ['locales'] },
    aliases: [{ actionId: 'plugin::content-manager.explorer.read', subjects: ['api::a.a'] }],
  },
] as const;
actionProvider.registerMany(actions);
actionProvider.register(actions[0]);

actionProvider.register({
  section: 'plugins',
  displayName: 'Read',
  // @ts-expect-error The computed ID `plugin::example.raed` is not declared.
  uid: 'raed',
  pluginName: 'example',
});
actionProvider.registerMany([
  // @ts-expect-error The computed ID `api::read` is not declared: the plugin name is missing.
  { section: 'plugins', displayName: 'Read', uid: 'read' },
]);

// Reads accept a declared literal or a runtime ID, and reject an undeclared literal.
actionProvider.get('plugin::example.read');
actionProvider.get(dynamicId);
actionProvider.has(`plugin::example.${dynamicId}`);
actionProvider.appliesToProperty('locales', dynamicId, null);
actionProvider.unstable_aliases('plugin::content-manager.explorer.read', 'api::a.a');
// @ts-expect-error The action ID is not declared.
actionProvider.get('plugin::example.raed');
// @ts-expect-error The action ID is not declared.
actionProvider.has('plugin::example.raed');
// @ts-expect-error The action ID is not declared.
actionProvider.appliesToProperty('locales', 'plugin::example.raed', null);
// @ts-expect-error The action ID is not declared.
actionProvider.unstable_aliases('plugin::example.raed');

// Route configs of both `hasPermissions` policies name declared actions only.
({
  policies: [
    {
      name: 'admin::hasPermissions',
      config: {
        actions: [
          'plugin::example.read',
          ['plugin::content-manager.explorer.read', 'api::a.a'],
          { action: 'admin::users.read' },
        ],
      },
    },
    {
      name: 'plugin::content-manager.hasPermissions',
      config: { actions: ['plugin::example.read'] },
    },
  ],
}) satisfies Core.RouteConfigFor;
({
  policies: [
    // @ts-expect-error The action ID is not declared.
    { name: 'admin::hasPermissions', config: { actions: ['admin::users.raed'] } },
  ],
}) satisfies Core.RouteConfigFor;
({
  policies: [
    {
      name: 'plugin::content-manager.hasPermissions',
      // @ts-expect-error The action ID is not declared.
      config: { actions: ['plugin::content-manager.explorer.raed'] },
    },
  ],
}) satisfies Core.RouteConfigFor;
