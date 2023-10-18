import CLITable from 'cli-table3';
import chalk from 'chalk';

import strapi from '../../../../Strapi';

export default async () => {
  const appContext = await strapi.compile();
  const app = await strapi(appContext).register();

  const list = Object.keys(app.components);

  const infoTable = new CLITable({
    head: [chalk.blue('Name')],
  });

  list.forEach((name) => infoTable.push([name]));

  console.log(infoTable.toString());

  await app.destroy();
};
