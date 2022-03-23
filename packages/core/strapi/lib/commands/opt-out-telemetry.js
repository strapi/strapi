'use strict';

const { resolve } = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');
const fetch = require('node-fetch');
const machineID = require('../utils/machine-id');

const readPackageJSON = async path => {
  try {
    const packageObj = await fse.readJson(path);
    const uuid = packageObj.strapi.uuid;

    return [uuid, packageObj];
  } catch (err) {
    console.error(`${chalk.red('Error')}: ${err.message}`);
  }
};

const writePackageJSON = async (path, file, spacing) => {
  try {
    await fse.writeJson(path, file, { spaces: spacing });
    return true;
  } catch (err) {
    console.error(`${chalk.red('Error')}: ${err.message}`);
  }
};

const sendEvent = async uuid => {
  try {
    await fetch('https://analytics.strapi.io/track', {
      method: 'POST',
      body: JSON.stringify({
        event: 'didOptOutTelemetry',
        uuid,
        deviceId: machineID(),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('success');
  } catch (e) {
    //...
  }
};

module.exports = async function optOutTelemetry() {
  const packageJSON = resolve(process.cwd(), 'package.json');

  if (!packageJSON) {
    console.log(`${chalk.yellow('Warning')}: could not find package.json`);
    process.exit(0);
  }

  const [uuid, packageObj] = await readPackageJSON(packageJSON);
  console.log(uuid);
  console.log(machineID());

  if (packageObj.strapi.optOutTelemetry || !uuid) {
    console.log(`${chalk.yellow('Warning:')} telemetry is already disabled`);
    process.exit(0);
  }

  const updatedPackageJSON = {
    ...packageObj,
    strapi: {
      uuid: packageObj.strapi.uuid,
      optOutTelemetry: true,
    },
  };

  const write = await writePackageJSON(packageJSON, updatedPackageJSON, 2);

  if (!write) {
    console.log(
      `${chalk.yellow(
        'Warning'
      )}: There has been an error, please set "optOutTelemetry": true in the "strapi" object of your package.json manually.`
    );
    process.exit(0);
  }

  await sendEvent(uuid);
  console.log(`${chalk.green('Successfully opted out of Strapi telemetry')}`);
  process.exit(0);
};
