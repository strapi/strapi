// Run by `playwright.migration.config.ts` before it starts Strapi: gives the migration end-to-end
// run the project it migrates. It removes the throwaway SQLite database of the previous run
// (`DATABASE_FILENAME`, relative to the Strapi application, the directory this is run from), starts
// the example as a project that still uses Users & Permissions (`END_USERS_E2E_MIGRATION=seed`, see
// `e2e-migration/harness.ts`), writes what the specs need, and stops. The next start is the migrated one.
//
// What it writes:
// - the user the first spec signs in as, through Users & Permissions' own `user.add` so the password
//   is hashed the way the old plugin hashes it. The password comes from the environment: the config
//   builds it at runtime and the spec reads it from there;
// - an `instagram` provider grant, which has no equivalent after the migration, so the report holds
//   an item an administrator acknowledges;
// - the first administrator of the admin panel (the same values as `e2e/admin/helpers.ts`).
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import path from 'node:path';

const filename = process.env.DATABASE_FILENAME;

// Never the development database: this deletes what it is told to, so it only accepts a name that
// says it is for the migration run
// ... and only a file inside the application's own .tmp folder, so a `../` can't lead elsewhere
const tmpDir = path.resolve(process.cwd(), '.tmp');
const target = filename ? path.resolve(process.cwd(), filename) : '';

if (
  !filename ||
  !path.basename(target).includes('e2e-migration') ||
  !target.startsWith(tmpDir + path.sep)
) {
  console.error(
    `DATABASE_FILENAME must name the migration e2e database (for example .tmp/e2e-migration.db), not "${filename ?? ''}": nothing was deleted.`
  );
  process.exit(1);
}

if (process.env.END_USERS_E2E_MIGRATION !== 'seed') {
  console.error('END_USERS_E2E_MIGRATION must be "seed" to run this: nothing was deleted.');
  process.exit(1);
}

const MIGRATED_EMAIL = 'migrated@example.com';
const MIGRATED_PASSWORD = process.env.E2E_MIGRATION_PASSWORD;

if (!MIGRATED_PASSWORD) {
  console.error('E2E_MIGRATION_PASSWORD is not set.');
  process.exit(1);
}

// The same files `e2e/reset-database.mjs` removes for the other run
for (const suffix of ['', '-journal', '-wal', '-shm']) {
  rmSync(path.join(process.cwd(), filename + suffix), { force: true });
}

// Test values for the e2e database, the same as `e2e/admin/helpers.ts`
const ADMIN = {
  email: 'e2e-admin@example.com',
  password: ['E2e-Admin', 'Passw0rd'].join('-'),
  firstname: 'E2E',
  lastname: 'Admin',
};

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const appContext = await compileStrapi();
const strapi = await createStrapi(appContext).load();

try {
  const authenticated = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });

  await strapi.plugin('users-permissions').service('user').add({
    username: 'migrated',
    email: MIGRATED_EMAIL,
    password: MIGRATED_PASSWORD,
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: authenticated.id,
  });

  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const grant = (await store.get({ key: 'grant' })) ?? {};

  await store.set({
    key: 'grant',
    value: { ...grant, instagram: { ...grant.instagram, enabled: true } },
  });

  const superAdmin = await strapi.service('admin::role').getSuperAdmin();

  await strapi.service('admin::user').create({
    ...ADMIN,
    roles: [superAdmin.id],
    isActive: true,
    registrationToken: null,
  });
} finally {
  await strapi.destroy();
}

process.exit(0);
