'use strict';

const path = require('path');
const execa = require('execa');
const fs = require('node:fs/promises');
const chalk = require('chalk');
const { createConfig } = require('../../../playwright.base.config');

/**
 * E2E test runner using Playwright
 */
class E2ERunner {
  async run({ domains, testAppPaths, concurrency, argv, testRoot, testDomainRoot, cwd }) {
    const testAppsToSpawn = Math.min(domains.length, concurrency);

    /**
     * You can't change the webserver configuration of playwright directly so they'd
     * all be looking at the same test app which we don't want, instead we'll generate
     * a playwright config based off the base one
     */
    const chunkedDomains = domains.reduce((acc, _, i) => {
      if (i % testAppsToSpawn === 0) acc.push(domains.slice(i, i + testAppsToSpawn));
      return acc;
    }, []);

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < chunkedDomains.length; i++) {
      const domains = chunkedDomains[i];

      await Promise.all(
        domains.map(async (domain, j) => {
          const testAppPath = testAppPaths[j];
          const port = 8000 + j;

          const pathToPlaywrightConfig = path.join(testAppPath, 'playwright.config.js');

          console.log(
            `Creating playwright config for domain: ${chalk.blue(
              domain
            )}, at path: ${chalk.yellow(testAppPath)}`
          );

          const config = createConfig({
            testDir: path.join(testDomainRoot, domain),
            port,
            appDir: testAppPath,
            reportFileName: `playwright-${domain}-${port}.xml`,
          });

          const configFileTemplate = `
const config = ${JSON.stringify(config)}

module.exports = config
          `;

          await fs.writeFile(pathToPlaywrightConfig, configFileTemplate);

          // Store the filesystem state with git so it can be reset between tests
          // TODO: if we have a large test test suite, it might be worth it to run a `strapi start` and then shutdown here to generate documentation and types only once and save unneccessary server restarts from those files being cleared every time
          console.log('Initializing git');

          const gitUser = ['-c', 'user.name=Strapi CLI', '-c', 'user.email=test@strapi.io'];

          await execa('git', [...gitUser, 'init'], {
            stdio: 'inherit',
            cwd: testAppPath,
          });

          // we need to use -A to track even hidden files like .env; remember we're only using git as a file state manager
          await execa('git', [...gitUser, 'add', '-A', '.'], {
            stdio: 'inherit',
            cwd: testAppPath,
          });

          await execa('git', [...gitUser, 'commit', '-m', 'initial commit'], {
            stdio: 'inherit',
            cwd: testAppPath,
          });

          // We need to generate the typescript and documentation files to avoid re-generating after each file reset

          // Start Strapi and wait for it to be ready
          console.log(`Starting Strapi for domain '${domain}' to generate files...`);
          const strapiProcess = execa('npm', ['run', 'develop'], {
            cwd: testAppPath,
            env: {
              PORT: port,
              STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
            },
            detached: true, // This is important for CI
          });

          // Wait for Strapi to be ready by checking HTTP endpoint
          await new Promise((resolve, reject) => {
            const startTime = Date.now();
            const timeout = 160 * 1000; // 160 seconds, matching Playwright's timeout
            const checkInterval = 1000; // Check every second

            const checkServer = async () => {
              try {
                const response = await fetch(`http://127.0.0.1:${port}/_health`);
                if (response.ok) {
                  console.log('Strapi is ready, shutting down...');
                  // In CI, we need to kill the entire process group
                  if (process.env.CI) {
                    process.kill(-strapiProcess.pid, 'SIGINT');
                  } else {
                    strapiProcess.kill('SIGINT');
                  }
                  resolve();
                  return;
                }
              } catch (err) {
                // Server not ready yet, continue checking
              }

              if (Date.now() - startTime > timeout) {
                console.log('Timeout reached, forcing shutdown...');
                if (process.env.CI) {
                  process.kill(-strapiProcess.pid, 'SIGKILL');
                } else {
                  strapiProcess.kill('SIGKILL');
                }
                reject(new Error('Strapi failed to start within timeout period'));
                return;
              }

              setTimeout(checkServer, checkInterval);
            };

            // Start checking
            checkServer();

            // Log stdout and stderr for debugging
            strapiProcess.stdout.on('data', (data) => {
              console.log(`[stdout] ${data.toString().trim()}`);
            });

            strapiProcess.stderr.on('data', (data) => {
              console.error(`[stderr] ${data.toString().trim()}`);
            });

            strapiProcess.on('error', (err) => {
              console.error(`[Strapi ERROR] Process error:`, err);
              reject(err);
            });

            strapiProcess.on('exit', (code) => {
              console.log(`Strapi process exited with code ${code}`);
            });
          });

          // Double check that Strapi has shut down
          await new Promise((resolve) => {
            const checkPort = async () => {
              try {
                await fetch(`http://127.0.0.1:${port}/_health`);
                // If we can connect, port is still in use
                setTimeout(checkPort, 1000);
              } catch (err) {
                // Port is free
                resolve();
              }
            };
            checkPort();
          });

          // Commit the generated files
          await execa('git', [...gitUser, 'add', '-A', '.'], {
            stdio: 'inherit',
            cwd: testAppPath,
          });

          await execa('git', [...gitUser, 'commit', '-m', 'commit generated files'], {
            stdio: 'inherit',
            cwd: testAppPath,
          });

          console.log(`Running ${chalk.blue(domain)} e2e tests`);

          await execa(
            'yarn',
            ['playwright', 'test', '--config', pathToPlaywrightConfig, ...argv._],
            {
              stdio: 'inherit',
              cwd,
              env: {
                PORT: port,
                HOST: '127.0.0.1',
                TEST_APP_PATH: testAppPath,
                STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
              },
            }
          );
        })
      );
    }
  }
}

module.exports = E2ERunner;
