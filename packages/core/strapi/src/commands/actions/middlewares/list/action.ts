import CLITable from 'cli-table3';
import chalk from 'chalk';

import { strapiFactory } from '@strapi/core';

export default async () => {
  const appContext = await strapiFactory.compile();
  const app = await strapiFactory(appContext).register();

  const list = app.get('middlewares').keys();

  const infoTable = new CLITable({
    head: [chalk.blue('Name')],
  });

  list.forEach((name: string) => infoTable.push([name]));

  console.log(infoTable.toString());

  await app.destroy();
};
