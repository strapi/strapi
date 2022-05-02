'use strict';

const path = require('path');
const CLITable = require('cli-table3');
const chalk = require('chalk');
const { toUpper } = require('lodash/fp');
const tsUtils = require('@strapi/typescript-utils');

const strapi = require('../../index');

module.exports = async function() {
  const appDir = process.cwd();

  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const distDir = isTSProject ? path.join(appDir, 'dist') : appDir;

  const app = await strapi({ appDir, distDir }).load();

  const list = app.server.listRoutes();

  const infoTable = new CLITable({
    head: [chalk.blue('Method'), chalk.blue('Path')],
    colWidths: [20],
  });

  list
    .filter(route => route.methods.length)
    .forEach(route => {
      infoTable.push([route.methods.map(toUpper).join('|'), route.path]);
    });

  console.log(infoTable.toString());

  await app.destroy();
};
