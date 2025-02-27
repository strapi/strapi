import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import chalk from 'chalk';
import { createStrapi, compileStrapi } from '@strapi/core';

import { runAction } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * List admin users
 */
const action = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const list = await app.admin.services.user.findPage({
    select: ['id', 'firstname', 'lastname', 'email', 'isActive', 'blocked'],
    populate: ['roles'],
    pageSize: 25,
  });

  const infoTable = new CLITable({
    head: [
      chalk.blue('ID'),
      chalk.blue('Email'),
      chalk.blue('First Name'),
      chalk.blue('Last Name'),
      chalk.blue('Active'),
      chalk.blue('Blocked'),
      chalk.blue('Roles'),
    ],
  });

  list.results.forEach((user: any) => {
    const roles = user.roles.map((role: any) => role.name).join(', ');
    infoTable.push([
      user.id,
      user.email,
      user.firstname,
      user.lastname,
      user.isActive === true ? chalk.green('true') : chalk.red('false'),
      user.blocked === true ? chalk.red('true') : chalk.green('false'),
      roles.length > 0 ? roles : chalk.yellow('No roles assigned'),
    ]);
  });

  console.log(infoTable.toString());

  await app.destroy();
};

/**
 * `$ strapi admin:list-users`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:list-users')
    .description('List all the admin users')
    .action(runAction('admin:list-users', action));
};

export { action, command };
