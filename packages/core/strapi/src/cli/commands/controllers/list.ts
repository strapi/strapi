import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import chalk from 'chalk';

import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

const action = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).register();

  const list = app.get('controllers').keys();

  const infoTable = new CLITable({
    head: [chalk.blue('Name')],
  });

  list.forEach((name: string) => infoTable.push([name]));

  console.log(infoTable.toString());

  await app.destroy();
};

/**
 * `$ strapi controllers:list`
 */
const command: StrapiCommand = () => {
  return createCommand('controllers:list')
    .description('List all the application controllers')
    .action(runAction('controllers:list', action));
};

export { action, command };
