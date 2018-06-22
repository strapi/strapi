const shell = require('shelljs');
const { includes } = require('lodash');

let isStrapiInstalledWithNPM;
let skipCheck = false;

const watcher = (cmd) => {
  const data = shell.exec(cmd, {
    silent: true,
  });

  if (includes(data.stderr, 'command not found') && data.code !== 0) {
    console.log('ERRRRR');
    throw new Error('Command not found');
  }

  return data.stdout.toString();
};

// Check if we are in development mode (working with the monorepo)
// So we don't run `npm -g ls` which takes time
if (process.argv.indexOf('new') !== -1 && process.argv.indexOf('--dev') !== -1) {
  skipCheck = true;
}

if (!skipCheck) {
  try {
    // Retrieve all the packages installed with NPM
    const data = watcher('npm -g ls');
    // Check if strapi is installed with NPM
    isStrapiInstalledWithNPM = includes(data, 'strapi');
  } catch(err) {
    // If NPM is not installed strapi is installed with Yarn
    isStrapiInstalledWithNPM = false;
  }
}

module.exports = {
  isStrapiInstalledWithNPM,

  commands: (cmdType, path = '') => {
    switch(cmdType) {
      case 'install --prefix':
        return isStrapiInstalledWithNPM ? `npm install --prefix ${path}` : `yarn --cwd ${path} add`;
      case 'root -g':
        return isStrapiInstalledWithNPM ? 'npm root -g' : 'yarn global dir';
      case 'install global':
        return isStrapiInstalledWithNPM ? 'npm install' : 'yarn install';
      case 'install package':
        return isStrapiInstalledWithNPM ? 'npm install' : 'yarn add';
      default:
        return '';
    }
  }
};