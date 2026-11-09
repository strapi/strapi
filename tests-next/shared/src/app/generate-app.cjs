/**
 * Runs create-strapi-app in its own Node process: it pulls in the cloud CLI, which uses ESM-only
 * dependencies that Jest can't load in a test process.
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
