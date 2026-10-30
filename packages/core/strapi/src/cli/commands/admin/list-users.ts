import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import { styleText } from 'node:util';
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
    pageSize: 100,
  });

  const infoTable = new CLITable({
    head: [
      styleText('blue', 'ID'),
      styleText('blue', 'Email'),
      styleText('blue', 'First Name'),
      styleText('blue', 'Last Name'),
      styleText('blue', 'Active'),
      styleText('blue', 'Blocked'),
      styleText('blue', 'Roles'),
    ],
  });

  list.results.forEach((user: any) => {
    const roles = user.roles.map((role: any) => role.name).join(', ');
    infoTable.push([
      user.id,
      user.email,
      user.firstname,
      user.lastname,
      user.isActive === true ? styleText('green', 'true') : styleText('red', 'false'),
      user.blocked === true ? styleText('red', 'true') : styleText('green', 'false'),
      roles.length > 0 ? roles : styleText('yellow', 'No roles assigned'),
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
    .alias('admin:list')
    .description('List all the admin users')
    .action(runAction('admin:list-users', action));
};

export { action, command };
