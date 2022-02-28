'use strict';

const chalk = require('chalk');
const fse = require('fs-extra');
const stopProcess = require('./stop-process');

/**
 * Checks if the an empty directory exists at rootPath
 * @param {string} rootPath
 */
module.exports = async rootPath => {
  if (await fse.pathExists(rootPath)) {
    const stat = await fse.stat(rootPath);

    if (!stat.isDirectory()) {
      stopProcess(
        `⛔️ ${chalk.green(
          rootPath
        )} is not a directory. Make sure to create a Strapi application in an empty directory.`
      );
      process.exit(1);
    }

    const files = await fse.readdir(rootPath);
    if (files.length > 1) {
      stopProcess(
        `⛔️ You can only create a Strapi app in an empty directory.\nMake sure ${chalk.green(
          rootPath
        )} is empty.`
      );
      process.exit(1);
    }
  }
};
