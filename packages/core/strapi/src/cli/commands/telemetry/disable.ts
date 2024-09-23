import { resolve } from 'path';
import fse from 'fs-extra';
import chalk from 'chalk';
import { createCommand } from 'commander';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { sendEvent } from '../../utils/telemetry';

const readPackageJSON = async (path: string) => {
  try {
    const packageObj = await fse.readJson(path);
    const uuid = packageObj.strapi ? packageObj.strapi.uuid : null;

    return { uuid, packageObj };
  } catch (err) {
    if (err instanceof Error) {
      console.error(`${chalk.red('Error')}: ${err.message}`);
    }
  }
};

const writePackageJSON = async (path: string, file: object, spacing: number) => {
  try {
    await fse.writeJson(path, file, { spaces: spacing });
    return true;
  } catch (err) {
    if (err instanceof Error) {
      console.error(`${chalk.red('Error')}: ${err.message}`);
    }
  }
};

const action = async () => {
  const packageJSONPath = resolve(process.cwd(), 'package.json');
  const exists = await fse.pathExists(packageJSONPath);

  if (!exists) {
    console.log(`${chalk.yellow('Warning')}: could not find package.json`);
    process.exit(0);
  }

  const { uuid, packageObj } = (await readPackageJSON(packageJSONPath)) ?? {};

  if ((packageObj.strapi && packageObj.strapi.telemetryDisabled) || !uuid) {
    console.log(`${chalk.yellow('Warning:')} telemetry is already disabled`);
    process.exit(0);
  }

  const updatedPackageJSON = {
    ...packageObj,
    strapi: {
      ...packageObj.strapi,
      telemetryDisabled: true,
    },
  };

  const write = await writePackageJSON(packageJSONPath, updatedPackageJSON, 2);

  if (!write) {
    console.log(
      `${chalk.yellow(
        'Warning'
      )}: There has been an error, please set "telemetryDisabled": true in the "strapi" object of your package.json manually.`
    );
    process.exit(0);
  }

  await sendEvent('didOptOutTelemetry', uuid);
  console.log(`${chalk.green('Successfully opted out of Strapi telemetry')}`);
  process.exit(0);
};

/**
 * `$ strapi telemetry:disable`
 */
const command: StrapiCommand = () => {
  return createCommand('telemetry:disable')
    .description('Disable anonymous telemetry and metadata sending to Strapi analytics')
    .action(runAction('telemetry:disable', action));
};

export { action, command };
