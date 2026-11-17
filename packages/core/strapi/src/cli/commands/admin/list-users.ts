import { createCommand } from 'commander';
import CLITable from 'cli-table3';
import chalk from 'chalk';
import { createStrapi, compileStrapi } from '@strapi/core';

import { runAction } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

interface MfaService {
  isEnabled(): boolean;
  requiredForUsers(users: unknown[]): Promise<boolean[]>;
}

const formatDate = (value: string | Date) => new Date(value).toISOString();

/** The same fields the admin panel's user list shows, from the same service call. */
const formatMfaState = (user: any, required: boolean) => {
  if (user.mfaLockedAt) {
    return chalk.red(`locked (${formatDate(user.mfaLockedAt)})`);
  }
  if (user.mfaEnabledAt) {
    return chalk.green('enrolled');
  }
  if (required) {
    return chalk.yellow(
      user.mfaGraceUntil ? `required (grace until ${formatDate(user.mfaGraceUntil)})` : 'required'
    );
  }
  return '-';
};

/**
 * List admin users
 */
const action = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const mfa = app.service('admin::mfa') as MfaService;
  const showMfa = mfa.isEnabled();

  const list = await app.admin.services.user.findPage({
    select: [
      'id',
      'firstname',
      'lastname',
      'email',
      'isActive',
      'blocked',
      // Read for the 2FA column, never printed: the exemption check needs the password field
      ...(showMfa ? ['password', 'mfaEnabledAt', 'mfaGraceUntil', 'mfaLockedAt'] : []),
    ],
    populate: ['roles'],
    pageSize: 100,
  });

  const required = showMfa ? await mfa.requiredForUsers(list.results) : [];

  const infoTable = new CLITable({
    head: [
      chalk.blue('ID'),
      chalk.blue('Email'),
      chalk.blue('First Name'),
      chalk.blue('Last Name'),
      chalk.blue('Active'),
      chalk.blue('Blocked'),
      chalk.blue('Roles'),
      ...(showMfa ? [chalk.blue('2FA')] : []),
    ],
  });

  list.results.forEach((user: any, index: number) => {
    const roles = user.roles.map((role: any) => role.name).join(', ');
    infoTable.push([
      user.id,
      user.email,
      user.firstname,
      user.lastname,
      user.isActive === true ? chalk.green('true') : chalk.red('false'),
      user.blocked === true ? chalk.red('true') : chalk.green('false'),
      roles.length > 0 ? roles : chalk.yellow('No roles assigned'),
      ...(showMfa ? [formatMfaState(user, required[index])] : []),
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
