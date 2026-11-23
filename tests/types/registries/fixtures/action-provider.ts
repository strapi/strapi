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
declare const subCategory: string | undefined;
declare const dynamicId: string;

const { actionProvider } = app.service('admin::permission');

// An optional field passed through as `undefined` compiles under `exactOptionalPropertyTypes`.
actionProvider.registerMany([
  { uid: 'read', section: 'plugins', displayName: 'Read', pluginName: 'example', subCategory },
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
// A key the action's section does not have fails at boot, and fails to compile.
actionProvider.register({
  section: 'plugins',
  displayName: 'Read',
  uid: 'read',
  pluginName: 'example',
  // @ts-expect-error `subcategory` is not a key of a `plugins` action: the schema is strict.
  subcategory: 'general',
});

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
// The admin EE IDs are declared, although they are registered only with their EE feature.
({
  policies: [
    {
      name: 'admin::hasPermissions',
      config: {
        actions: [
          'admin::provider-login.read',
          'admin::provider-login.update',
          'admin::audit-logs.read',
          'admin::audit-logs.export',
        ],
      },
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

// The action provider hooks hand their handlers a typed context.
actionProvider.hooks.appliesPropertyToSubject.register(({ property, action, subject }) => {
  property satisfies string;
  action.actionId satisfies string;
  subject satisfies string;
  return true;
});
actionProvider.hooks.willRegister.register(({ key, value }) => {
  key satisfies string;
  // The registration schema accepts `undefined` items, and the provider keeps them.
  value.options.applyToProperties satisfies (string | undefined)[] | null;
});
actionProvider.hooks.didRegister.register(({ value }) => value.actionId satisfies string);
actionProvider.hooks.willDelete.register(
  ({ value }) => value?.actionId satisfies string | undefined
);
actionProvider.hooks.didDelete.register(({ value }) => {
  // @ts-expect-error The action of a deleted key is read with `get`, so it may be `undefined`.
  value.actionId;
});
actionProvider.hooks.appliesPropertyToSubject.register(
  // @ts-expect-error The context has no `actionId`: the action is `action`.
  ({ actionId }: { actionId: string }) => actionId !== ''
);
actionProvider.hooks.willRegister.register(
  // @ts-expect-error The registered action is `value`, not `action`.
  ({ action }: { action: { actionId: string } }) => action.actionId
);

// The hooks, `get`, `values` and the section handlers and matchers receive the action as the provider
// stores it (`domain/action/index.ts` `create`): one member per section, as the registration schema.
// Only `settings` actions have a `category`, only `contentTypes` actions have `subjects`, and only
// `settings` and `plugins` actions have a `subCategory` (`'general'` by default).
actionProvider.hooks.willRegister.register(({ value }) => {
  // @ts-expect-error A `category` exists only on `settings` actions.
  value.category.toUpperCase();
  if (value.section === 'settings') {
    value.category satisfies string;
    value.subCategory satisfies string;
  }
  if (value.section === 'contentTypes') {
    value.subjects satisfies (string | undefined)[];
  }
  if (value.section === 'plugins') {
    value.pluginName satisfies string;
    value.subCategory satisfies string;
  }
});
actionProvider.hooks.didRegister.register(({ value }) => {
  // @ts-expect-error A `category` exists only on `settings` actions.
  value.category.toUpperCase();
});
actionProvider.hooks.willDelete.register(({ value }) => {
  // @ts-expect-error A `category` exists only on `settings` actions.
  value?.category.toUpperCase();
});
actionProvider.hooks.didDelete.register(({ value }) => {
  // @ts-expect-error A `category` exists only on `settings` actions.
  value?.category.toUpperCase();
  if (value?.section === 'settings') {
    value.category satisfies string;
  }
});
actionProvider.hooks.appliesPropertyToSubject.register(({ action }) => {
  // @ts-expect-error A `category` exists only on `settings` actions.
  action.category.toUpperCase();
  return action.section === 'settings' && action.category !== '';
});
const readAction = actionProvider.get(dynamicId);
// @ts-expect-error A `category` exists only on `settings` actions.
readAction?.category.toUpperCase();
if (readAction?.section === 'plugins') {
  readAction.pluginName satisfies string;
}
for (const storedAction of actionProvider.values()) {
  // @ts-expect-error A `category` exists only on `settings` actions.
  storedAction.category.toUpperCase();
  if (storedAction.section === 'contentTypes') {
    storedAction.subjects satisfies (string | undefined)[];
  }
}
const { sectionsBuilder } = app.service('admin::permission');
sectionsBuilder.addHandler('plugins', ({ action }) => {
  // @ts-expect-error A `category` exists only on `settings` actions.
  action.category.toUpperCase();
});
sectionsBuilder.addMatcher(
  'settings',
  (action) => action.section === 'settings' && action.category
);
void sectionsBuilder.build(actionProvider.values());

// `admin::content-type` builds permissions from the actions `values` and `get` return.
const contentTypeService = app.service('admin::content-type');
contentTypeService.getPermissionsWithNestedFields(
  actionProvider.values().filter((action) => action.section === 'contentTypes')
);
const explorerRead = actionProvider.get('plugin::content-manager.explorer.read');
if (explorerRead !== undefined) {
  contentTypeService.getPermissionsWithNestedFields([explorerRead]);
}

// `admin::action` returns the actions `values` returns.
void app
  .service('admin::action')
  .getAllowedActionsForRole()
  .then((allowedActions) => {
    for (const allowedAction of allowedActions) {
      // @ts-expect-error A `category` exists only on `settings` actions.
      allowedAction.category.toUpperCase();
      if (allowedAction.section === 'settings') {
        allowedAction.category satisfies string;
      }
    }
  });

// The condition provider hooks hand their handlers the registered condition: `domain.create` keeps
// the condition fields only, so it has no `name`.
const { conditionProvider } = app.service('admin::permission');
conditionProvider.hooks.willRegister.register(({ key, value }) => {
  key satisfies string;
  value.id satisfies string;
  value.displayName satisfies string;
});
conditionProvider.hooks.didRegister.register(
  ({ value }) => value.plugin satisfies string | undefined
);
conditionProvider.hooks.willDelete.register(({ value }) => value?.id satisfies string | undefined);
conditionProvider.hooks.didDelete.register(({ value }) => {
  // @ts-expect-error The condition of a deleted key is read with `get`, so it may be `undefined`.
  value.id;
});
conditionProvider.hooks.willRegister.register(
  // @ts-expect-error The registered condition has no `name`.
  ({ value }: { value: { name: string } }) => value.name
);
