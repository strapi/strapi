'use strict';

const { resolve, join, basename } = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');

module.exports = async function optOutTelemetry() {
  const packageJSON = resolve(process.cwd(), 'package.json')

  let uuid

  try {
    const packageObj = await fse.readJson(packageJSON)

    uuid = packageObj.strapi.uuid

    if (packageObj.strapi.optOutTelemetry || !uuid) {
      console.log(`${chalk.yellow('Warning:')} you have already opted out of telemetry`)
      process.exit(0)
    }

    

  } catch (err) {
    console.error(`${chalk.red('error')}: ${error.message}`)
  }

  
}