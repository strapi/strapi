'use strict';

const { resolve } = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const machineID = require('../utils/machine-id');

const readPackageJSON = async (path) => {
  try {
    const packageObj = await fse.readJson(path);
    return packageObj;
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
    console.log(
      `${chalk.yellow(
        'Warning'
      )}: There has been an error, please set "telemetryDisabled": false in the "strapi" object of your package.json manually.`
    );
    return false;
  }
};

const generateNewPackageJSON = (packageObj) => {
  if (!packageObj.strapi) {
    return {
      ...packageObj,
      strapi: {
        uuid: uuidv4(),
        telemetryDisabled: false,
      },
    };
  }
  return {
    ...packageObj,
    strapi: {
      ...packageObj.strapi,
      uuid: packageObj.strapi.uuid ? packageObj.strapi.uuid : uuidv4(),
      telemetryDisabled: false,
    },
  };
};

const sendEvent = async (uuid) => {
  try {
    await fetch('https://analytics.strapi.io/track', {
      method: 'POST',
      body: JSON.stringify({
        event: 'didOptInTelemetry',
        deviceId: machineID(),
        properties: {
          groupProperties: { projectId: uuid },
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // ...
  }
};

module.exports = async function optInTelemetry() {
  const packageJSONPath = resolve(process.cwd(), 'package.json');
  const exists = await fse.pathExists(packageJSONPath);

  if (!exists) {
    console.log(`${chalk.yellow('Warning')}: could not find package.json`);
    process.exit(0);
  }

  const packageObj = await readPackageJSON(packageJSONPath);

  if (packageObj.strapi && packageObj.strapi.uuid) {
    if (packageObj.strapi.telemetryDisabled === false) {
      console.log(`${chalk.yellow('Warning:')} telemetry is already enabled`);
      process.exit(0);
    }
  }

  const updatedPackageJSON = generateNewPackageJSON(packageObj);

  const write = await writePackageJSON(packageJSONPath, updatedPackageJSON, 2);

  if (!write) {
    process.exit(0);
  }

  await sendEvent(updatedPackageJSON.strapi.uuid);
  console.log(`${chalk.green('Successfully opted into and enabled Strapi telemetry')}`);
  process.exit(0);
};
