const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const cypress = require('cypress')
const { deleteApp } = require('./helpers/deleteFolder');

const strapiBin = path.resolve('./packages/strapi/bin/strapi.js');
const appName = 'testApp';
let testExitCode = 0;
let appStart;

const databases = {
  mongo: `--dbclient=mongo --dbhost=127.0.0.1 --dbport=27017 --dbname=strapi-test-${new Date().getTime()} --dbusername= --dbpassword=`,
  postgres: '--dbclient=postgres --dbhost=127.0.0.1 --dbport=5432 --dbname=strapi-test --dbusername= --dbpassword=',
  mysql: '--dbclient=mysql --dbhost=127.0.0.1 --dbport=3306 --dbname=strapi-test --dbusername=root --dbpassword=root'
};

const {runCLI: jest} = require('jest-cli/build/cli');

const main = async () => {
  const clean = () => {
    return new Promise(async (resolve) => {
      try {
        fs.accessSync(appName);
        await deleteApp(path.resolve(appName));
      } catch(err) {
        // Silent
      }
      resolve();
    });
  };

  const generate = (database) => {
    return new Promise((resolve, reject) => {
      const appCreation = spawn('node', `${strapiBin} new ${appName} --dev ${database}`.split(' '), { detached: true });

      appCreation.stdout.on('data', data => {
        console.log(data.toString().trim());

        if (data.includes('is ready at')) {
          process.kill(appCreation.pid);
          return resolve();
        }

        if (data.includes('Database connection has failed')) {
          process.kill(appCreation.pid);
          return reject(new Error('Database connection has failed'));
        }
      });
    });
  };

  const start = () => {
    return new Promise((resolve, reject) => {
      try {
        shell.cd('./testApp');
        appStart = shell.exec(`strapi start`, { async: true, silent: true });
        appStart.stdout.on('data', (data) => {
          if (data.includes('To shut down your server')) {
            shell.cd('..');
            return resolve();
          } else {
            console.log(data.trim());
          }
        });

      } catch (e) {
        console.log(e)
        if (typeof appStart !== 'undefined') {
          process.kill(appStart.pid);
        }
        return reject(e);
      }
    });
  };


  const test = () => {
    return new Promise(async (resolve) => {
      // Run setup tests to generate the app.
      await jest({
        passWithNoTests: true,
        testURL: 'http://localhost/'
      }, [process.cwd()]);

      const packagesPath = path.resolve(process.cwd(), 'packages');

      const packages = fs.readdirSync(packagesPath)
        .filter(file => file.indexOf('strapi') !== -1);

      // Run tests in every packages.
      for (let i in packages) {
        await jest({
          passWithNoTests: true,
          testURL: 'http://localhost/'
        }, [path.resolve(packagesPath, packages[i])]);
      }

      resolve();
    });
  };

  const cypressTest = () => {
    const config = Object.assign({ spec: './packages/**/test/front/integration/*' }, process.env.npm_config_browser === 'true' ? { browser: 'chrome' } : {});
    
    return cypress
      .run(config);
  }

  const testProcess = async (database) => {
    try {
      await clean();
      await generate(database);
      await start();
      await cypressTest();
      // await test();
      process.kill(appStart.pid);
    } catch (e) {
      console.error(e.message);
      testExitCode = 1;
    }
  };

  await testProcess(databases.mongo);
  // await testProcess(databases.postgres);
  // await testProcess(databases.mysql);
  // process.exit(testExitCode);
};

main();
