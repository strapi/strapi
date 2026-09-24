import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;
declare const enabled: Strapi.Registries.Settings extends { strict: true } ? true : false;

enabled satisfies false;
app.plugin('i18n').service('locales').anything();
app.plugin('sentry').service('sentry').anything();
