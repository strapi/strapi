const path = require('path');
const rimraf = require('rimraf');
const execa = require('execa');

const STRAPI_BIN = path.resolve(
  __dirname,
  '../../packages/strapi/bin/strapi.js'
);

/**
 * Delete the testApp folder
 * @param {string} appName - name of the app / folder where the app is located
 */
const cleanTestApp = appName => {
  return new Promise((resolve, reject) => {
    rimraf(path.resolve(appName), err => {
      if (err) reject(err);
      resolve();
    });
  });
};

/**
 * Runs strapi generate new
 * @param {Object} options - Options
 * @param {string} options.appName - Name of the app that will be created (also the name of the folder)
 * @param {database} options.database - Arguments to create the testApp with the provided database params
 */
const generateTestApp = async ({ appName, database }) => {
  await execa.shell(`node ${STRAPI_BIN} new ${appName} ${database}`, {
    stdio: 'inherit',
  });

  await execa.shell(
    'yarn add strapi-plugin-graphql strapi-plugin-documentation',
    {
      cwd: path.resolve(appName),
    }
  );

  await execa.shell(
    `node scripts/copy-monorepo.js ${appName} --run-once --quiet`,
    {
      stdio: 'inherit',
    }
  );
};

/**
 * Starts the test App in the appName folder
 * @param {Object} options - Options
 * @param {string} options.appName - Name of the app / folder in which run the start script
 */
const startTestApp = ({ appName }) => {
  return execa.shell('strapi develop --no-build', {
    stdio: 'inherit',
    cwd: path.resolve(appName),
  });
};

module.exports = {
  cleanTestApp,
  generateTestApp,
  startTestApp,
};
