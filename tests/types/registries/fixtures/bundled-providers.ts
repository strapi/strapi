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
// Every service of the admin service map has a contract, including the debug dump.
void app
  .service('admin::debug-dump')
  .generate()
  .then((dump) => dump.dumpVersion satisfies 1);
// No role may match: `findOne` resolves to `null`.
void app
  .service('admin::role')
  .findOne({ id: 1 })
  .then((role) => {
    // @ts-expect-error The role may be null.
    role.code satisfies string;
    role?.code satisfies string | undefined;
  });
// The super admin role may be missing: `getSuperAdmin` resolves to `null`, not `undefined`.
void app
  .service('admin::role')
  .getSuperAdmin()
  .then((role) => {
    // @ts-expect-error The role may be null.
    role.id satisfies unknown;
    // @ts-expect-error The role is never undefined.
    role satisfies { id: unknown } | undefined;
    role satisfies { id: unknown } | null;
  });
void app
  .service('admin::role')
  .findOneWithUsersCount({ id: 1 })
  .then((role) => {
    // @ts-expect-error The role may be null.
    role.usersCount satisfies number;
    role?.usersCount satisfies number | undefined;
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

// Core store rows registered by the bundled packages read their JSON shape, or `null` without a row.
void app.store.get({ type: 'plugin', name: 'i18n', key: 'default_locale' }).then((code) => {
  code satisfies string | null;
  // @ts-expect-error The row may be missing.
  code satisfies string;
});
void app
  .store({ type: 'plugin', name: 'upload', key: 'settings' })
  .get()
  .then((settings) => settings?.sizeOptimization satisfies boolean | undefined);
void app
  .store({ type: 'core', name: 'admin' })
  .get({ key: `homepage-layout:${1}` })
  .then((layout) => layout?.widgets satisfies unknown[] | undefined);
void app.store.set({
  type: 'plugin',
  name: 'upload',
  key: 'settings',
  // @ts-expect-error A registered row takes its whole value.
  value: { sizeOptimization: true },
});
// Unregistered rows keep `unknown`.
void app.store.get({ type: 'type', key: 'setup_initHasRun' }).then((value) => {
  // @ts-expect-error The value is unknown.
  value.anything;
});

// Events registered by the bundled packages: emits are checked and listeners receive the payloads.
app.eventHub.on('user.delete', (payload) => {
  if ('users' in payload) {
    payload.users.map((user) => user.id) satisfies Array<string | number>;
  } else {
    payload.user.id satisfies string | number;
  }
});
app.eventHub.on('entry.publish', ({ uid, entry }) => {
  uid satisfies string;
  entry.documentId satisfies string;
});
void app.eventHub.emit('ee.enable');
// @ts-expect-error A registered event takes its registered payload.
void app.eventHub.emit('entry.create', { model: 'article' });
// Unregistered events keep their permissive types.
void app.eventHub.emit('my-app.custom', 1, 2);
