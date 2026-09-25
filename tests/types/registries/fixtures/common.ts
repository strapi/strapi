import type { Core, UID } from '@strapi/strapi';

declare const app: Core.Strapi;
declare const dynamicName: string;

const uid: UID.ContentType = 'api::article.article';
uid satisfies 'api::article.article';
// @ts-expect-error Generated schema declarations still narrow content type UIDs.
const missingUID: UID.ContentType = 'api::missing.missing';
missingUID satisfies unknown;

app.plugin(dynamicName).service('locales').anything();
app.plugin('i18n').service(dynamicName).anything();

const explicit = app.plugin('i18n').service<{ application: true }>('locales');
explicit satisfies { application: true };
const explicitConfig = app.config.get<number>('server.port');
explicitConfig satisfies number;

declare const controllers: {
  locales: { listLocales: Core.ControllerHandler };
  settings: () => { getSettings: Core.ControllerHandler };
};

type Router = Core.RouterInputFor<typeof controllers, 'plugin::i18n'>;

({
  type: 'admin',
  routes: [
    { method: 'GET', path: '/locales', handler: 'locales.listLocales' },
    { method: 'GET', path: '/locales', handler: 'plugin::i18n.locales.listLocales' },
    { method: 'GET', path: '/settings', handler: 'settings.getSettings' },
  ],
}) satisfies Router;

({
  type: 'admin',
  routes: [
    // @ts-expect-error Explicitly typed handler references are strict in both switch modes.
    { method: 'GET', path: '/locales', handler: 'locales.listLocale' },
    // @ts-expect-error The absolute form must use the declared namespace.
    { method: 'GET', path: '/locales', handler: 'plugin::other.locales.listLocales' },
  ],
}) satisfies Router;

// Existing untyped routes retain their permissive policy inventory.
({
  method: 'GET',
  path: '/locales',
  handler: 'locales.listLocales',
  config: { policies: ['global::unregistered'] },
}) satisfies Core.RouteInput;
