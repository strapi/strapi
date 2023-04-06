'use strict';

const CLITable = require('cli-table3');
const chalk = require('chalk');

const strapi = require('../../index');

module.exports = async function () {
  const appContext = await strapi.compile();
  const app = await strapi(appContext).register();

  const list = app.container.get('middlewares').keys();

  const infoTable = new CLITable({
    head: [chalk.blue('Name')],
  });

  list.forEach((name) => infoTable.push([name]));

  console.log(infoTable.toString());

  await app.destroy();
};
