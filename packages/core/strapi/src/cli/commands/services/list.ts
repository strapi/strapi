import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import chalk from 'chalk';
import { createStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { compileStrapi } from '../../../compile';

const action = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).register();

  const list = app.get('services').keys();

  const infoTable = new CLITable({
    head: [chalk.blue('Name')],
  });

  list.forEach((name: string) => infoTable.push([name]));

  console.log(infoTable.toString());

  await app.destroy();
};

/**
 * `$ strapi services:list`
 */
const command: StrapiCommand = () => {
  return createCommand('services:list')
    .description('List all the application services')
    .action(runAction('services:list', action));
};

export { action, command };
