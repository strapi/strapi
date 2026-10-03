import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import chalk from 'chalk';
import { toUpper } from 'lodash/fp';

import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';

const action = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const list = app.server.mount().listRoutes();

  const infoTable = new CLITable({
    head: [chalk.blue('Method'), chalk.blue('Path')],
    colWidths: [20],
  });

  list
    .filter((route) => route.methods.length)
    .forEach((route) => {
      infoTable.push([route.methods.map(toUpper).join('|'), route.path]);
    });

  console.log(infoTable.toString());

  await app.destroy();
};

/**
 * `$ strapi routes:list``
 */
const command: StrapiCommand = () => {
  return createCommand('routes:list').description('List all the application routes').action(action);
};

export { action, command };
