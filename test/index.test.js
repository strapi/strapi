const exec = require('child_process').exec;
const fs = require('fs-extra');
const path = require('path');

const bin = path.resolve('./packages/strapi/bin/strapi.js');
const appName = 'testApp';

describe('Basic setup', () => {
  beforeAll(() => {
    return new Promise(resolve => {
      fs.exists(appName, exists => {
        if (exists) {
          fs.removeSync(appName);
        }

        resolve();
      });
    });
  });

  test(
    'Create new test app',
    () => {
      return expect(
        new Promise(resolve => {
          const appCreation = exec(
            `node ${bin} new ${appName} --dev --dbclient=mongo --dbhost=localhost --dbport=27017 --dbname=strapi-test-${new Date().getTime()} --dbusername="" --dbpassword=""`,
          );

          appCreation.stdout.on('data', data => {
            if (data.includes('is ready at')) {
              appCreation.kill();
              return resolve(true);
            }

            if (data.includes('Database connection has failed')) {
              appCreation.kill();
              return resolve(false);
            }
          });
        }),
      ).resolves.toBeTruthy();
    },
    120000,
  );
});
