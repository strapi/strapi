/**
 * Runs create-strapi-app in its own Node process: it pulls in the cloud CLI and its ESM-only
 * dependencies, and prints a banner. Keeping it out of the test process keeps both out of the
 * test runner's module graph and logs.
 *
 *   node generate-app.cjs '<scope as JSON>'
 */

const { createStrapi } = require('create-strapi-app');

createStrapi(JSON.parse(process.argv[2])).then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
