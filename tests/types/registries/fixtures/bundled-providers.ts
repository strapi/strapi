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
// EE-feature plugins register their services only with the feature: they may be undefined.
app.plugin('review-workflows').service('workflows')?.getAssignedWorkflow satisfies
  ((...args: never[]) => unknown) | undefined;
app.plugin('content-releases').service('release')?.findPage satisfies
  ((...args: never[]) => unknown) | undefined;
// @ts-expect-error The service may be undefined.
app.plugin('content-releases').service('release').findPage satisfies unknown;
app.service('admin::role').getSuperAdmin satisfies (...args: never[]) => unknown;
// No role may match: `findOne` resolves to `null`.
void app
  .service('admin::role')
  .findOne({ id: 1 })
  .then((role) => {
    // @ts-expect-error The role may be null.
    role.code satisfies string;
    role?.code satisfies string | undefined;
  });
// EE-only members stay optional on the shared contract.
// @ts-expect-error `ssoCheckRolesIdForDeletion` only exists in EE.
app.service('admin::role').ssoCheckRolesIdForDeletion([]);
// Optional plugins are not loaded by the app entry.
// @ts-expect-error Unregistered services resolve to `unknown`.
app.plugin('graphql').service('utils').anything();

// The hooks of the Strapi instance are registered by `@strapi/types`.
app.hook('strapi::content-types.afterSync').register(({ oldContentTypes }) => {
  // @ts-expect-error The saved schemas are missing before the first saved start.
  Object.keys(oldContentTypes);
});
// @ts-expect-error Unregistered hooks resolve to `unknown`.
app.hook('plugin::unregistered.hook').register(() => {});

declare const enabled: Strapi.Registries.Settings extends { strict: true } ? true : false;
enabled satisfies true;
// EE-only admin services do not exist in a CE runtime: their contract includes `undefined`.
// @ts-expect-error The service may be undefined.
void app.service('admin::persist-tables').persistTablesWithPrefix('prefix');
// @ts-expect-error The service may be undefined.
void app.service('admin::seat-enforcement').getDisabledUserList();
app.service('admin::seat-enforcement')?.getDisabledUserList satisfies
  ((...args: never[]) => unknown) | undefined;
