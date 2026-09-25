import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

// The app entry loads bundled providers without pulling in optional plugin contracts:
// the unregistered Sentry service resolves to `never` with the switch on.
const sentry = app.plugin('sentry').service('sentry');
sentry satisfies never;
// Bundled admin contracts are loaded.
app.service('admin::permission').engine satisfies object;
// Every bundled package that registers contracts is loaded, including EE-merged admin services.
app.plugin('upload').service('upload').formatFileInfo satisfies (...args: never[]) => unknown;
app.plugin('email').service('email').sendTemplatedEmail satisfies (...args: never[]) => unknown;
app.plugin('content-type-builder').service('content-types') satisfies object;
app.plugin('review-workflows').service('workflows').getAssignedWorkflow satisfies (
  ...args: never[]
) => unknown;
app.plugin('content-releases').service('release').findPage satisfies (...args: never[]) => unknown;
app.service('admin::role').getSuperAdmin satisfies (...args: never[]) => unknown;
// EE-only members stay optional on the shared contract.
// @ts-expect-error `ssoCheckRolesIdForDeletion` only exists in EE.
app.service('admin::role').ssoCheckRolesIdForDeletion([]);
// Optional plugins are not loaded by the app entry.
app.plugin('graphql').service('utils') satisfies never;

declare const enabled: Strapi.Registries.Settings extends { strict: true } ? true : false;
enabled satisfies true;
