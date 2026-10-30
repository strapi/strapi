import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import { styleText } from 'node:util';
import { toUpper } from 'lodash';

import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

const action = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const list = app.server.mount().listRoutes();

  const infoTable = new CLITable({
    head: [styleText('blue', 'Method'), styleText('blue', 'Path')],
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
  return createCommand('routes:list')
    .description('List all the application routes')
    .action(runAction('routes:list', action));
};

export { action, command };
