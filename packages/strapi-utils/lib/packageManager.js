const shell = require('shelljs');
const _ = require('lodash');

let isStrapiInstalledWithNPM;

const watcher = (cmd) => {

  const data = shell.exec(cmd, {
    silent: true,
  });

  if (data.stderr && data.code !== 0) {
    throw new Error('Command not found');
  }

  return data.stdout.toString();
};

try {
  const data = watcher('npm -g ls');
  isStrapiInstalledWithNPM = _.includes(data, 'strapi');
} catch(err) {
  isStrapiInstalledWithNPM = false;
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