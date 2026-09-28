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
