'use strict';

const path = require('path');
const execa = require('execa');
const fs = require('node:fs/promises');
const { cleanTestApp, generateTestApp } = require('../../helpers/test-app');

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
const gitUser = ['-c', 'user.name=Strapi CLI', '-c', 'user.email=test@strapi.io'];

const setupTestApps = async ({
  testAppDirectory,
  testAppPaths,
  templateDir,
  setup,
  currentTestApps,
  // When true (e2e), create one git commit per generated app as the `resetFiles` save point.
  commitE2eBaseline = false,
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
      })
    );

    if (commitE2eBaseline) {
      for (const appPath of testAppPaths) {
        await execa('git', [...gitUser, 'init'], {
          stdio: 'inherit',
          cwd: appPath,
        });
        await execa('git', [...gitUser, 'add', '-A', '.'], {
          stdio: 'inherit',
          cwd: appPath,
        });
        await execa(
          'git',
          [...gitUser, '-c', 'commit.gpgsign=false', 'commit', '-m', 'e2e test app baseline'],
          {
            stdio: 'inherit',
            cwd: appPath,
          }
        );
      }
    }

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
};
