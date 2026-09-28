import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

// The app entry loads bundled providers without pulling in optional plugin contracts:
// the unregistered Sentry service has no members with the switch on.
// @ts-expect-error Unregistered services resolve to `unknown`.
app.plugin('sentry').service('sentry').anything();
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
// @ts-expect-error Unregistered services resolve to `unknown`.
app.plugin('graphql').service('utils').anything();

declare const enabled: Strapi.Registries.Settings extends { strict: true } ? true : false;
enabled satisfies true;
