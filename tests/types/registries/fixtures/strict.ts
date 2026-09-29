import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

const locales = app.plugin('i18n').service('locales');
const defaultLocale = locales.getDefaultLocale();
defaultLocale satisfies Promise<string | null>;
// @ts-expect-error The return type includes null.
defaultLocale satisfies Promise<string>;
// @ts-expect-error The registered service has no arbitrary members.
locales.missing();
// @ts-expect-error Full UID lookup uses the same service contract.
app.service('plugin::i18n.locales').missing();
// @ts-expect-error The global instance uses the same service contract.
strapi.plugin('i18n').service('locales').missing();

declare const locale: { id: number; code: string; name: string | null; isDefault: 'stale' };
const withDefault = locales.setIsDefault(locale);
withDefault satisfies Promise<{
  id: number;
  code: string;
  name: string | null;
  isDefault: boolean;
}>;
const updated = locales.update({ id: 1 }, { name: 'French' });
updated satisfies Promise<{ id: string | number; code: string; name: string | null } | null>;
// @ts-expect-error Locale codes cannot change after creation.
locales.update({ id: 1 }, { code: 'fr' });
// @ts-expect-error A locale code is required at creation.
locales.create({ name: 'French' });

const controller = app.plugin('i18n').controller('locales');
controller.listLocales satisfies Core.ControllerHandler;
// @ts-expect-error Registered controllers have no arbitrary actions.
controller.missing satisfies unknown;
const isoLocales = app.controller('plugin::i18n.iso-locales');
isoLocales.listIsoLocales satisfies Core.ControllerHandler;
// @ts-expect-error Full UID lookup preserves the controller contract.
isoLocales.missing satisfies unknown;
const contentTypes = app.controller('plugin::i18n.content-types');
contentTypes.getNonLocalizedAttributes satisfies Core.ControllerHandler;
const jobs = app.plugin('i18n').controller('ai-localization-jobs');
jobs.getJobForCollectionType satisfies Core.ControllerHandler;

({
  policies: [
    'admin::isAuthenticatedAdmin',
    'admin::isTelemetryEnabled',
    'plugin::content-manager.hasPermissions',
    {
      name: 'plugin::content-manager.hasPermissions',
      config: { actions: ['read'], hasAtLeastOne: true },
    },
  ],
}) satisfies Core.RouteConfigFor;

({
  // @ts-expect-error An application must register its policies when the switch is on.
  policies: ['global::unregistered'],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Registered policy names reject typos.
  policies: ['admin::isAuthenticatedAdmn'],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Content-manager's policy contract checks its optional config.
  policies: [{ name: 'plugin::content-manager.hasPermissions', config: { hasAtLeastOne: 'yes' } }],
}) satisfies Core.RouteConfigFor;

/** `true` only for `unknown`: `any` and every other type give `false`. */
declare function exactlyUnknown<T>(
  value: T
): [unknown] extends [T] ? (0 extends 1 & T ? false : true) : false;

// Unregistered literal names resolve to `unknown` in the emitted declarations too.
exactlyUnknown(app.service('plugin::i18n.unregistered')) satisfies true;
exactlyUnknown(app.plugin('i18n').service('unregistered')) satisfies true;
exactlyUnknown(app.plugin('unregistered').service('greeting')) satisfies true;
exactlyUnknown(app.controller('plugin::i18n.unregistered')) satisfies true;
exactlyUnknown(app.plugin('i18n').controller('unregistered')) satisfies true;
// @ts-expect-error Unregistered literal names expose no members.
app.plugin('i18n').service('unregistered').anything();

// Explicit generics use the type argument.
const explicitService = app.plugin('i18n').service<{ greet(): string }>('unregistered');
explicitService.greet() satisfies string;
const explicitFullUidService = app.service<{ greet(): string }>('plugin::i18n.unregistered');
explicitFullUidService.greet() satisfies string;
const explicitFullUidController = app.controller<{ list: Core.ControllerHandler }>(
  'api::unregistered.items'
);
explicitFullUidController.list satisfies Core.ControllerHandler;
// @ts-expect-error The explicit contract has no arbitrary members.
explicitFullUidService.anything();

// Dynamic names cannot be validated, so they resolve to `unknown` too.
declare const dynamicName: string;
declare const patternUid: `plugin::i18n.${string}`;
exactlyUnknown(app.plugin('i18n').service(dynamicName)) satisfies true;
exactlyUnknown(app.plugin(dynamicName).service('greeting')) satisfies true;
exactlyUnknown(app.plugin(dynamicName).service('locales')) satisfies true;
exactlyUnknown(app.service(patternUid)) satisfies true;
exactlyUnknown(app.plugin('i18n').controller(dynamicName)) satisfies true;

// Bundled admin contracts cover the permission service.
const permission = app.service('admin::permission');
permission.actionProvider.registerMany satisfies (...args: never[]) => unknown;
// @ts-expect-error The admin permission contract has no arbitrary members.
permission.missing();

// Plural accessors resolve registered keys to the same contracts as the singular lookups.
const pluralLocales = app.services['plugin::i18n.locales'];
const singularLocales = app.service('plugin::i18n.locales');
pluralLocales satisfies typeof singularLocales;
singularLocales satisfies typeof pluralLocales;
pluralLocales.getDefaultLocale() satisfies Promise<string | null>;
// @ts-expect-error Plural lookups use the registered service contract.
pluralLocales.missing();
const pluginLocales = app.plugin('i18n').services.locales;
pluginLocales.getDefaultLocale() satisfies Promise<string | null>;
// @ts-expect-error Plugin maps use the registered service contract.
pluginLocales.missing();
// @ts-expect-error The plugins map resolves `Plugin<'i18n'>` for registered plugins.
app.plugins.i18n.services.locales.missing();
// @ts-expect-error The global instance uses the same plural contracts.
strapi.plugin('i18n').services.locales.missing();
app.controllers['plugin::i18n.locales'].listLocales satisfies Core.ControllerHandler;
// @ts-expect-error Plural controller lookups use the registered contract.
app.plugin('i18n').controllers.locales.missing satisfies unknown;
// @ts-expect-error Bundled admin contracts cover the plural accessors too.
app.services['admin::permission'].missing();

// Unregistered and dynamic keys keep the legacy types: records cannot close literal keys only.
// With `noUncheckedIndexedAccess`, only these index-signature reads include `undefined`.
app.services['plugin::i18n.unregistered']?.anything();
app.services[dynamicName]?.anything();
app.plugin('i18n').services[dynamicName]?.anything();
app.plugins[dynamicName]?.services.greeting?.anything();
app.controllers[dynamicName]?.anything satisfies Core.ControllerHandler | undefined;
// @ts-expect-error Unregistered keys may be absent.
app.services['plugin::i18n.unregistered'].anything();
for (const service of Object.values(app.plugin(dynamicName).services)) {
  service.anything();
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppServices {
        'api::strict-fixture.items': { count(): number };
      }
      interface AppControllers {
        'api::strict-fixture.items': { find: Core.ControllerHandler };
      }
      interface AppPolicies {
        'api::strict-fixture.isOwner': { field: string };
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type FixturePolicy = Core.PolicyHandler<{ custom: true }>;

// Policy lookups resolve registered names to a policy that receives their config contract.
// `strapi.policy` takes full names, plugin lookups relative names, as at runtime.
const adminPolicy = app.policy('admin::isAuthenticatedAdmin');
const permissionsPolicy = app.policy('plugin::content-manager.hasPermissions');
const pluginPermissionsPolicy = app.plugin('content-manager').policy('hasPermissions');
declare const policyChecks: [
  Expect<Equal<typeof adminPolicy, Core.Policy<undefined>>>,
  Expect<
    Equal<
      typeof permissionsPolicy,
      Core.Policy<Core.PolicyConfigFor<'plugin::content-manager.hasPermissions'>>
    >
  >,
  Expect<Equal<typeof pluginPermissionsPolicy, typeof permissionsPolicy>>,
];
policyChecks satisfies unknown;
exactlyUnknown(app.policy('global::unregistered')) satisfies true;
exactlyUnknown(app.policy('hasPermissions')) satisfies true;
exactlyUnknown(app.policy(dynamicName)) satisfies true;
exactlyUnknown(app.plugin('content-manager').policy('unregistered')) satisfies true;
exactlyUnknown(app.plugin('content-manager').policy(dynamicName)) satisfies true;
exactlyUnknown(app.plugin(dynamicName).policy('hasPermissions')) satisfies true;
const explicitPolicy = app.policy<FixturePolicy>('global::unregistered');
const explicitPluginPolicy = app.plugin('i18n').policy<FixturePolicy>('unregistered');
declare const explicitPolicyChecks: [
  Expect<Equal<typeof explicitPolicy, FixturePolicy>>,
  Expect<Equal<typeof explicitPluginPolicy, FixturePolicy>>,
];
explicitPolicyChecks satisfies unknown;
// @ts-expect-error A type annotation on the result does not replace the type argument.
const contextualPolicy: FixturePolicy = app.policy('global::unregistered');
contextualPolicy satisfies unknown;

// API module lookups resolve registered names relative to the API.
app.api('strict-fixture').service('items').count() satisfies number;
// @ts-expect-error API service lookups use the registered contract.
app.api('strict-fixture').service('items').missing();
app.api('strict-fixture').controller('items').find satisfies Core.ControllerHandler;
// @ts-expect-error API controller lookups use the registered contract.
app.api('strict-fixture').controller('items').missing satisfies unknown;
exactlyUnknown(app.api('strict-fixture').service('unregistered')) satisfies true;
exactlyUnknown(app.api('strict-fixture').controller('unregistered')) satisfies true;
exactlyUnknown(app.api('strict-fixture').service(dynamicName)) satisfies true;
exactlyUnknown(app.api(dynamicName).controller('items')) satisfies true;
app.api('strict-fixture').service<{ greet(): string }>('unregistered').greet() satisfies string;
app.api('unregistered').controller<{ list: Core.ControllerHandler }>('items')
  .list satisfies Core.ControllerHandler;
// @ts-expect-error A type annotation on the result does not replace the type argument.
const contextualApiService: { greet(): string } = app.api('strict-fixture').service('unregistered');
contextualApiService satisfies unknown;

// API module policy lookups resolve relative names, like plugin lookups.
const apiPolicy = app.api('strict-fixture').policy('isOwner');
const explicitApiPolicy = app.api('strict-fixture').policy<FixturePolicy>('unregistered');
declare const apiPolicyChecks: [
  Expect<Equal<typeof apiPolicy, Core.Policy<{ field: string }>>>,
  Expect<Equal<typeof explicitApiPolicy, FixturePolicy>>,
];
apiPolicyChecks satisfies unknown;
exactlyUnknown(app.api('strict-fixture').policy('unregistered')) satisfies true;
exactlyUnknown(app.api('strict-fixture').policy('api::strict-fixture.isOwner')) satisfies true;
exactlyUnknown(app.api('strict-fixture').policy(dynamicName)) satisfies true;
exactlyUnknown(app.api(dynamicName).policy('isOwner')) satisfies true;
// @ts-expect-error A type annotation on the result does not replace the type argument.
const contextualApiPolicy: FixturePolicy = app.api('strict-fixture').policy('unregistered');
contextualApiPolicy satisfies unknown;
