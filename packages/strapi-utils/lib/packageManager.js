const fs = require('fs');
const shell = require('shelljs');
const { includes } = require('lodash');

// let isStrapiInstalledWithNPM = true;
// let skipCheck = false;

const watcher = (cmd) => {
  const data = shell.exec(cmd, {
    silent: true,
  });

  if (includes(data.stderr, 'command not found') && data.code !== 0) {
    throw new Error('Command not found');
  }

  return data.stdout.toString();
};

module.exports = {
  isStrapiInstalledWithNPM: () => {
    let isNPM = true;
    let skipCheck = false;

    // Check if we are in development mode (working with the monorepo)
    // So we don't run `npm -g ls` which takes time
    if (process.argv.indexOf('new') !== -1 && process.argv.indexOf('--dev') !== -1) {
      skipCheck = true;
    }

    if (!skipCheck) {
      try {
        // Retrieve all the packages installed with NPM
        const npmPath = watcher('npm root -g');

        const data = fs.readdirSync(npmPath.trim());

        // Check if strapi is installed with NPM
        isNPM = includes(data, 'strapi');

        try {
          const yarnData = watcher('yarn global ls');
          isNPM = includes(yarnData, 'strapi');
        } catch(err) {
          isNPM = true;
        }
      } catch(err) {
        // If NPM is not installed strapi is installed with Yarn
        isNPM = false;
      }
    }

    return isNPM;
  },

  commands: function (cmdType, path = '') {
    const isNPM = this.isStrapiInstalledWithNPM();

    switch(cmdType) {
      case 'install --prefix':
        return isNPM ? `npm install --prefix ${path}` : `yarn --cwd ${path} add`;
      case 'root -g':
        return isNPM ? 'npm root -g' : 'yarn global dir';
      case 'install global':
        return isNPM ? 'npm install' : 'yarn install';
      case 'install package':
        return isNPM ? 'npm install' : 'yarn add';
      default:
        return '';
    }
  }
};
