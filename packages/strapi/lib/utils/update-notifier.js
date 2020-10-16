const updateNotifier = require('update-notifier');
const chalk = require('chalk');
const pkg = require('../../package');

const logWarningIfNewStrapiVersion = () => {
  const notifier = updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24 * 7, // 1 week
    shouldNotifyInNpmScript: true,
  });

  const currentVersionLog = chalk.dim('{currentVersion}');
  const newVersionLog = chalk.green('{latestVersion}');
  const releaseLink = chalk.bold('https://github.com/strapi/strapi/releases');
  let message = `
  A new version of Strapi is available ${currentVersionLog} → ${newVersionLog}
  Check out new releases at: ${releaseLink}
  `;

  notifier.notify({ defer: false, message: message.trim() });
};

module.exports = {
  logWarningIfNewStrapiVersion,
};
