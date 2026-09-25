import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

// The app entry loads bundled providers without pulling in optional plugin contracts:
// the unregistered Sentry service resolves to `never` with the switch on.
const sentry = app.plugin('sentry').service('sentry');
sentry satisfies never;
// Bundled admin contracts are loaded.
app.service('admin::permission').engine satisfies object;

declare const enabled: Strapi.Registries.Settings extends { strict: true } ? true : false;
enabled satisfies true;
