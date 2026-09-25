import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

// Loading all providers and application declarations must not turn the switch on.
app.plugin('i18n').service('locales').anything();
app.service('plugin::i18n.locales').anything();
app.plugin('sentry').service('sentry').anything();
strapi.plugin('sentry').service('sentry').anything();
app.plugin('i18n').controller('locales').anything satisfies Core.ControllerHandler | undefined;
app.controller('plugin::i18n.settings').anything satisfies Core.ControllerHandler | undefined;
// Unregistered literal names keep the permissive signature without the switch.
app.service('plugin::i18n.unregistered').anything();
app.plugin('unregistered').service('greeting').anything();
app.plugin('i18n').controller('unregistered').anything satisfies Core.ControllerHandler | undefined;

const config = app.config.get('plugin::sentry');
// @ts-expect-error Without an inferred generic, legacy config lookup returns unknown.
config satisfies { dsn: string | null };
const dsn = app.plugin('sentry').config('dsn');
// @ts-expect-error Loaded provider contracts do not narrow the legacy unknown result.
dsn satisfies string | null;
const contextualConfig: number = app.config.get('plugin::sentry.dsn');
const contextualPluginConfig: number = app.plugin('sentry').config('dsn');
contextualConfig satisfies number;
contextualPluginConfig satisfies number;
app.config.get('plugin::sentry.sendMetadata', 'yes');
app.plugin('sentry').config('sendMetadata', 'yes');

({
  policies: [
    'global::unregistered',
    'admin::hasPermissions',
    { name: 'admin::hasPermissions', config: { actions: 'read' } },
    { name: 'plugin::content-manager.hasPermissions', config: { hasAtLeastOne: 'yes' } },
  ],
}) satisfies Core.RouteConfigFor;
const explicitFullUidService = app.service<{ greet(): string }>('plugin::i18n.unregistered');
explicitFullUidService.greet() satisfies string;
