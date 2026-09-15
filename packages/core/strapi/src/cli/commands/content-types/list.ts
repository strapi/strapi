import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import chalk from 'chalk';

import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';

const action = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).register();

  const list = app.get('content-types').keys();

  const infoTable = new CLITable({
    head: [chalk.blue('Name')],
  });

  list.forEach((name: string) => infoTable.push([name]));

  console.log(infoTable.toString());

  await app.destroy();
};

/**
 * `$ strapi content-types:list`
 */
const command: StrapiCommand = () => {
  return createCommand('content-types:list')
    .description('List all the application content-types')
    .action(action);
};

export { action, command };
