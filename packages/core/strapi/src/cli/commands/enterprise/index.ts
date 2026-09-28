import { createCommand } from 'commander';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { action as install } from './install/action';

/**
 * `$ strapi enterprise`
 */
const command: StrapiCommand = ({ ctx }) => {
  const enterprise = createCommand('enterprise').description(
    'Manage Strapi Enterprise plugins for your Strapi application'
  );

  // `$ strapi enterprise install [packages...] [--debug]`
  enterprise
    .command('install [packages...]')
    .description(
      'Install or upgrade Strapi Enterprise plugins. Without package names, choose them from a list.'
    )
    // The CLI turns on debug logs when argv has `--debug`, before any command runs. Declared here so
    // the command accepts it. No `-d` short form, since the CLI does not look for that one.
    .option('--debug', 'Enable debugging mode with verbose logs', false)
    .action(runAction('enterprise:install', (packages: string[] = []) => install(packages, ctx)));

  return enterprise;
};

export { command };
