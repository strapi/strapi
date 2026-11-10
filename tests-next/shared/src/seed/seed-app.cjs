/**
 * Seeds an app before its server starts: loads Strapi without the HTTP server (register and
 * bootstrap, which create the database and sync the schemas), applies the plan, and destroys the
 * instance. Runs in its own Node process, with the env the server will use.
 *
 *   node seed-app.cjs <app dir> <plan.json> <result.json>
 */

const fs = require('node:fs');

// The test plugin's seeders, so a plan behaves the same before boot and in a running server.
// eslint-disable-next-line import/no-relative-packages
const { runSeed } = require('../../test-plugin/lib/seed');

const [appDir, planFile, resultFile] = process.argv.slice(2);

const main = async () => {
  const { createStrapi } = require('@strapi/strapi');
  const strapi = await createStrapi({
    appDir,
    distDir: appDir,
    autoReload: false,
    serveAdminPanel: false,
  }).load();

  try {
    const result = await runSeed(strapi, JSON.parse(fs.readFileSync(planFile, 'utf8')));
    fs.writeFileSync(resultFile, JSON.stringify(result));
  } finally {
    await strapi.destroy();
  }
};

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
