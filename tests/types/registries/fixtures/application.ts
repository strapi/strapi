import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

const sentry = app.plugin('sentry').service('sentry');
const application = sentry.custom();
application satisfies 'application';
// @ts-expect-error An application contract replaces the default instead of intersecting it.
sentry.sendError(new Error('example'));
const fullService = app.service('plugin::sentry.sentry');
fullService satisfies typeof sentry;
const globalService = strapi.plugin('sentry').service('sentry');
globalService satisfies typeof sentry;

const config = app.config.get('plugin::sentry');
config.dsn satisfies string;
config.init.application satisfies true;
// @ts-expect-error The original Sentry init options are replaced.
config.init.debug satisfies unknown;
const dsn = app.plugin('sentry').config('dsn');
dsn satisfies string;
const applicationConfig = app.config.get('plugin::sentry.init.application');
applicationConfig satisfies true;
// @ts-expect-error Application config still validates defaults.
app.config.get('plugin::sentry.sendMetadata', 'yes');

const controller = app.plugin('i18n').controller('settings');
controller.custom satisfies Core.ControllerHandler<'application'>;
// @ts-expect-error The default controller action is replaced.
controller.getSettings satisfies unknown;
const fullController = app.controller('plugin::i18n.settings');
fullController satisfies typeof controller;

({
  policies: ['global::isOwner', { name: 'admin::hasPermissions', config: { application: true } }],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error The default admin permissions config is replaced.
  policies: [{ name: 'admin::hasPermissions', config: { actions: ['read'] } }],
}) satisfies Core.RouteConfigFor;
