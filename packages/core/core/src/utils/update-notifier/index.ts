import path from 'path';
import packageJson from 'package-json';
import Configstore from 'configstore';
import semver from 'semver';
import boxen from 'boxen';
import chalk from 'chalk';
import { env } from '@strapi/utils';
import type { Strapi } from '@strapi/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../../package.json');

const CHECK_INTERVAL = 1000 * 60 * 60 * 24 * 1; // 1 day
const NOTIF_INTERVAL = 1000 * 60 * 60 * 24 * 7; // 1 week
const boxenOptions: boxen.Options = {
  padding: 1,
  margin: 1,
  align: 'center',
  borderColor: 'yellow',
  borderStyle: 'round',
};

const getUpdateMessage = (newVersion: string, currentVersion: string) => {
  const currentVersionLog = chalk.dim(currentVersion);
  const newVersionLog = chalk.green(newVersion);
  const releaseLink = chalk.bold('https://github.com/strapi/strapi/releases');

  return `
A new version of Strapi is available ${currentVersionLog} → ${newVersionLog}
Check out the new releases at: ${releaseLink}
`.trim();
};

const createUpdateNotifier = (strapi: Strapi) => {
  let config: InstanceType<typeof Configstore>;

  try {
    config = new Configstore(
      pkg.name,
      {},
      { configPath: path.join(strapi.dirs.app.root, '.strapi-updater.json') }
    );
  } catch {
    // we don't have write access to the file system
    // we silence the error
  }

  const checkUpdate = async (checkInterval: number) => {
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

  const display = (notifInterval: number) => {
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

    const message = boxen(getUpdateMessage(latestVersion, pkg.version), boxenOptions);
    config.set('lastNotification', now);
    console.log(message);
  };

  return {
    notify({ checkInterval = CHECK_INTERVAL, notifInterval = NOTIF_INTERVAL } = {}) {
      if (env.bool('STRAPI_DISABLE_UPDATE_NOTIFICATION', false) || !config) {
        return;
      }
      display(notifInterval);
      checkUpdate(checkInterval); // doesn't need to await
    },
  };
};

export default createUpdateNotifier;
