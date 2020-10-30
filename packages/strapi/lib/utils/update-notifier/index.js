'use strict';
const packageJson = require('package-json');
const Configstore = require('configstore');
const semver = require('semver');
const boxen = require('boxen');
const chalk = require('chalk');
const pkg = require('../../../package');
const CHECK_INTERVAL = 1000 * 60 * 60 * 24 * 1; // 1 day
const NOTIF_INTERVAL = 1000 * 60 * 60 * 24 * 7; // 1 week
const boxenOptions = {
  padding: 1,
  margin: 1,
  align: 'center',
  borderColor: 'yellow',
  borderStyle: 'round',
};

const geUpdatetMessage = (newVersion, currentVersion) => {
  const currentVersionLog = chalk.dim(currentVersion);
  const newVersionLog = chalk.green(newVersion);
  const releaseLink = chalk.bold('https://github.com/strapi/strapi/releases');

  return `
A new version of Strapi is available ${currentVersionLog} → ${newVersionLog}
Check out new the releases at: ${releaseLink}
`.trim();
};

const createNotifyUpdater = strapi => {
  const config = new Configstore(
    pkg.name,
    {},
    { configPath: `${strapi.dir}/.strapi-updater.json` }
  );

  const checkUpdate = async checkInterval => {
    const now = Date.now();
    const lastUpdateCheck = config.get('lastUpdateCheck') || 0;
    if (lastUpdateCheck + checkInterval > now) {
      return;
    }

    try {
      const res = await packageJson(pkg.name);
      if (res.version) {
        config.set('latest', res.version);
        config.set('lastUpdateCheck', now);
      }
    } catch {
      // silence error if offline
    }
  };

  const display = notifInterval => {
    const now = Date.now();
    const latestVersion = config.get('latest');
    const lastNotification = config.get('lastNotification') || 0;
    if (
      !process.stdout.isTTY ||
      lastNotification + notifInterval > now ||
      !semver.valid(latestVersion) ||
      !semver.valid(pkg.version) ||
      semver.lte(latestVersion, pkg.version)
    ) {
      return;
    }

    const message = boxen(geUpdatetMessage(latestVersion, pkg.version), boxenOptions);
    config.set('lastNotification', now);
    console.log(message);
  };

  return {
    notify({ checkInterval = CHECK_INTERVAL, notifInterval = NOTIF_INTERVAL } = {}) {
      display(notifInterval);
      checkUpdate(checkInterval); // doesn't need to await
    },
  };
};

module.exports = createNotifyUpdater;
