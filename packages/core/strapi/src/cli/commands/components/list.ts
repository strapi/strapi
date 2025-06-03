import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import chalk from 'chalk';
import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

const action = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).register();

  const list = Object.keys(app.components);

  const infoTable = new CLITable({
    head: [chalk.blue('Name')],
  });

  list.forEach((name) => infoTable.push([name]));

  console.log(infoTable.toString());

  await app.destroy();
};

/**
 * `$ strapi components:list`
 */
const command: StrapiCommand = () => {
  return createCommand('components:list')
    .description('List all the application components')
    .action(runAction('components:list', action));
};

export { action, command };
