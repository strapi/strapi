'use strict';

/**
 * Spike (CMS-1943): in-process seed. Run with the test app as cwd, while no server is running:
 *   node <repo>/tests-next/shared/spike/seed.js
 *
 * Loads Strapi without starting the HTTP server, so bootstrap creates the DB, syncs the schemas
 * (including any scaffolded before boot) and the default admin roles. Then seeds through the
 * services and the Document Service, and destroys the instance.
 */

const path = require('node:path');

const appDir = process.cwd();
// Resolve @strapi/strapi from the test app, not from the monorepo.
const { createStrapi } = require(require.resolve('@strapi/strapi', { paths: [appDir] }));

const PASSWORD = 'Testing123!';
const USERS = [
  { email: 'test@testing.com', firstname: 'Test', lastname: 'Admin', role: 'strapi-super-admin' },
  { email: 'editor@testing.com', firstname: 'Editor', lastname: 'User', role: 'strapi-editor' },
  { email: 'author@testing.com', firstname: 'Author', lastname: 'User', role: 'strapi-author' },
];

const time = async (label, fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  console.log(`[seed] ${label}: ${ms.toFixed(0)} ms`);
  return result;
};

const main = async () => {
  const strapi = await time('load (register + bootstrap, creates the DB)', () =>
    createStrapi({ appDir, distDir: appDir, autoReload: false, serveAdminPanel: false }).load()
  );

  await time('admin users', async () => {
    for (const user of USERS) {
      const role = await strapi.db.query('admin::role').findOne({ where: { code: user.role } });
      await strapi.service('admin::user').create({
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        password: PASSWORD,
        isActive: true,
        roles: [role.id],
      });
    }
  });

  await time('entries', async () => {
    for (const title of ['Why I prefer football over soccer', 'Spike article']) {
      await strapi.documents('api::article.article').create({ data: { title } });
    }
    if (strapi.contentType('api::spike-item.spike-item')) {
      await strapi.documents('api::spike-item.spike-item').create({ data: { name: 'scaffolded' } });
    }
  });

  await time('destroy', () => strapi.destroy());
  console.log(
    `[seed] db: ${path.relative(appDir, strapi.config.get('database.connection.connection.filename'))}`
  );
};

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
