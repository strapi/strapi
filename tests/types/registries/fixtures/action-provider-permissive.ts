import type {} from '@strapi/strapi';
import type {} from '@strapi/admin/strapi-server';
import type {} from '@strapi/content-manager/strapi-server';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type ActionProvider = Strapi.Registries.PackageServices['admin::permission']['actionProvider'];
declare const actionProvider: ActionProvider;

// Without strict types, the action provider keeps develop's signatures: any ID is accepted.
declare const signatures: [
  Expect<Equal<Parameters<ActionProvider['get']>, [key: string]>>,
  Expect<Equal<Parameters<ActionProvider['has']>, [key: string]>>,
  Expect<
    Equal<
      Parameters<ActionProvider['unstable_aliases']>,
      [actionId: string, subject?: string | null]
    >
  >,
];
signatures satisfies unknown;
actionProvider.get('plugin::example.raed');
actionProvider.appliesToProperty('locales', 'plugin::example.raed', null);
actionProvider.register({
  section: 'plugins',
  displayName: 'Read',
  category: 'Example',
  uid: 'raed',
  pluginName: 'example',
});
actionProvider.registerMany([
  { section: 'plugins', displayName: 'Read', category: 'Example', uid: 'raed' },
]);

// Both `hasPermissions` configs accept any action ID.
const adminConfig: Strapi.Registries.PackagePolicies['admin::hasPermissions'] = {
  actions: ['admin::users.raed', ['plugin::example.raed', 'api::a.a'], { action: 'raed' }],
};
const contentManagerConfig: Strapi.Registries.PackagePolicies['plugin::content-manager.hasPermissions'] =
  { actions: ['plugin::content-manager.explorer.raed'] };
// Read back, the actions are strings.
adminConfig.actions satisfies Array<string | string[] | { action: string }>;
contentManagerConfig.actions satisfies string[] | undefined;
