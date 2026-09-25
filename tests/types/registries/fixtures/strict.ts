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

// Unregistered literal names resolve to `never`; the emitted declarations close the fallback too.
const unregisteredService = app.service('plugin::i18n.unregistered');
unregisteredService satisfies never;
const unregisteredPluginService = app.plugin('i18n').service('unregistered');
unregisteredPluginService satisfies never;
const unknownPluginService = app.plugin('unregistered').service('greeting');
unknownPluginService satisfies never;
const unregisteredController = app.controller('plugin::i18n.unregistered');
unregisteredController satisfies never;
const unregisteredPluginController = app.plugin('i18n').controller('unregistered');
unregisteredPluginController satisfies never;
// @ts-expect-error Unregistered literal names expose no members.
app.plugin('i18n').service('unregistered').anything();

// Explicit generics and dynamic names keep the permissive signature.
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
declare const dynamicName: string;
declare const patternUid: `plugin::i18n.${string}`;
app.plugin('i18n').service(dynamicName).anything();
app.plugin(dynamicName).service('greeting').anything();
app.service(patternUid).anything();
app.plugin('i18n').controller(dynamicName).anything satisfies Core.ControllerHandler | undefined;

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
