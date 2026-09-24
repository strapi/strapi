import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

// The app entry loads bundled providers without pulling in optional plugin contracts.
app.plugin('sentry').service('sentry').anything();

declare const enabled: Strapi.Registries.Settings extends { strict: true } ? true : false;
enabled satisfies true;
