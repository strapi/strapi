'use strict';

const chalk = require('chalk');
const fp = require('lodash/fp');

const logWarning = message => {
  console.log(chalk.yellow(`[${new Date().toLocaleTimeString()}] (warning):\t${message}`));
};

const getSchemaTypeName = fp.flow(fp.replace(/(:.)/, ' '), fp.camelCase, fp.upperFirst);

module.exports = {
  logWarning,
  getSchemaTypeName,
};
