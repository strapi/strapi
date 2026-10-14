import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

const sentry = app.plugin('sentry').service('sentry');
sentry.sendError(new Error('example'));
// @ts-expect-error The Sentry contract checks the exception argument.
sentry.sendError('example');
// @ts-expect-error The default service has no application method.
sentry.custom();
const fullService = app.service('plugin::sentry.sentry');
fullService satisfies typeof sentry;

const config = app.config.get('plugin::sentry');
config.dsn satisfies string | null;
config.sendMetadata satisfies boolean;
// @ts-expect-error Registered namespace lookup does not return any.
config.missing satisfies unknown;
const dsn = app.config.get('plugin::sentry.dsn');
dsn satisfies string | null;
// @ts-expect-error A registered nullable field remains nullable.
dsn satisfies string;
const debug = app.plugin('sentry').config('init.debug');
debug satisfies boolean | undefined;
// @ts-expect-error Config defaults must match the registered field.
app.plugin('sentry').config('sendMetadata', 'yes');
// @ts-expect-error Full namespace paths check defaults too.
app.config.get('plugin::sentry.sendMetadata', 'yes');

const controller = app.plugin('i18n').controller('settings');
controller.getSettings satisfies Core.ControllerHandler;
// @ts-expect-error The default controller has no application action.
controller.custom satisfies unknown;

({
  policies: [
    { name: 'admin::hasPermissions', config: { actions: ['read', ['update', 'article']] } },
  ],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Admin permissions require config.
  policies: ['admin::hasPermissions'],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Admin permissions require an array of actions.
  policies: [{ name: 'admin::hasPermissions', config: { actions: 'read' } }],
}) satisfies Core.RouteConfigFor;
