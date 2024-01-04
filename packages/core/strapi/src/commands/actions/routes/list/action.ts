import CLITable from 'cli-table3';
import chalk from 'chalk';
import { toUpper } from 'lodash/fp';

import { strapiFactory } from '@strapi/core';

export default async () => {
  const appContext = await strapiFactory.compile();
  const app = await strapiFactory(appContext).load();

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
