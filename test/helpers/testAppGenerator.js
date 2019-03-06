const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const rimraf = require('rimraf');
const execa = require('execa');

const STRAPI_BIN = path.resolve('./packages/strapi/bin/strapi.js');

const cleanTestApp = appName => {
  return new Promise(async resolve => {
    rimraf(path.resolve(appName), () => {
      resolve();
    });
  });
};

const generateTestApp = ({ appName, database }) => {
  return execa.shell(`node ${STRAPI_BIN} new ${appName} --dev ${database}`, {
    stdio: 'inherit',
  });
};

function promiseFromChildProcess(child) {
  return new Promise(function(resolve, reject) {
    child.on('error', reject);
    child.on('exit', resolve);
  });
}

const startTestApp = ({ appName }) => {
  const app = execa.shell(`strapi start`, {
    stdio: 'pipe',
    detached: true,
    cwd: path.resolve(appName),
    env: {
      FORCE_COLOR: 1,
    },
  });

  app.stdout.pipe(process.stdout);
  app.stderr.pipe(process.stderr);

  const ready = new Promise((resolve, reject) => {
    app.stdout.on('data', data => {
      if (data.includes('To shut down your server')) {
        return resolve();
      }
    });

    setTimeout(() => reject(new Error('Too long to start')), 30000);
  });

  return {
    testApp: app,
    ready,
    end: promiseFromChildProcess(app),
  };
};

module.exports = {
  cleanTestApp,
  generateTestApp,
  startTestApp,
};
