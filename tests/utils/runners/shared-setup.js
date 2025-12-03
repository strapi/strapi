'use strict';

const path = require('path');
const execa = require('execa');
const fs = require('node:fs/promises');
const { cleanTestApp, generateTestApp } = require('../../helpers/test-app');

const pathExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Updates the env file for a generated test app (browser-specific)
 * - Uses app-template/config/features.js to enable future features in the generated app
 */
const setupTestEnvironment = async (generatedAppPath, templateDir) => {
  /*
   * Enable future features in the generated app manually since a template
   * does not allow the config folder.
   */
  const testRootFeaturesConfigPath = path.join(templateDir, 'config', 'features.js');
  const hasFeaturesConfig = await pathExists(testRootFeaturesConfigPath);

  if (!hasFeaturesConfig) return;

  const configFeatures = await fs.readFile(testRootFeaturesConfigPath);
  const appFeaturesConfigPath = path.join(generatedAppPath, 'config', 'features.js');
  await fs.writeFile(appFeaturesConfigPath, configFeatures);
};

/**
 * Publish all packages to yalc store
 */
const publishYalc = async (cwd) => {
  await execa('node', [path.join(cwd, 'scripts', 'yalc-publish.js')], {
    stdio: 'inherit',
  });
};

/**
 * Setup test apps - clean and generate
 */
const setupTestApps = async ({
  testAppDirectory,
  testAppPaths,
  templateDir,
  setup,
  currentTestApps,
  setupTestEnvironment,
}) => {
  /**
   * If we don't have enough test apps, we make enough.
   * You can also force this setup if desired, e.g. you
   * update the app-template.
   */
  if (setup || currentTestApps.length < testAppPaths.length) {
    /**
     * this will effectively clean the entire directory before hand
     * as opposed to cleaning the ones we aim to spawn.
     */
    await Promise.all(
      currentTestApps.map(async (testAppName) => {
        const appPath =
          typeof testAppName === 'string' ? path.join(testAppDirectory, testAppName) : testAppName;
        console.log(`Cleaning test app at path: ${appPath}`);
        await cleanTestApp(appPath);
      })
    );

    /**
     * Generate the test apps and modify the configuration as needed
     */
    await Promise.all(
      testAppPaths.map(async (appPath) => {
        console.log(`Generating test apps at path: ${appPath}`);
        await generateTestApp({
          appPath,
          database: {
            client: 'sqlite',
            connection: {
              filename: './.tmp/data.db',
            },
            useNullAsDefault: true,
          },
          template: templateDir,
          link: true,
        });

        // Remove PORT from .env (common to both browser and CLI)
        const pathToEnv = path.join(appPath, '.env');
        const envFile = (await fs.readFile(pathToEnv)).toString();
        const envWithoutPort = envFile.replace('PORT=1337', '');
        await fs.writeFile(pathToEnv, envWithoutPort);

        // Run additional setup if provided (browser-specific setupTestEnvironment)
        if (setupTestEnvironment) {
          await setupTestEnvironment(appPath, templateDir);
        }
      })
    );

    return true;
  }

  return false;
};

/**
 * Get current test apps from directory
 */
const getCurrentTestApps = async (testAppDirectory) => {
  try {
    const apps = await fs.readdir(testAppDirectory);
    // Filter to only return directories that match test-app-* pattern
    // This excludes test-results and other non-test-app directories
    const testAppPattern = /^test-app-\d+$/;
    const testAppPaths = [];
    for (const appName of apps) {
      if (testAppPattern.test(appName)) {
        const appPath = path.join(testAppDirectory, appName);
        const stats = await fs.stat(appPath);
        if (stats.isDirectory()) {
          testAppPaths.push(appPath);
        }
      }
    }
    return testAppPaths;
  } catch (err) {
    // no test apps exist, okay to fail silently
    return [];
  }
};

module.exports = {
  publishYalc,
  setupTestApps,
  getCurrentTestApps,
  setupTestEnvironment,
};
