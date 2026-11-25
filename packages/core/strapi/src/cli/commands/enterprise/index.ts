import { createCommand, Option } from 'commander';

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

  // `$ strapi enterprise install [packages...]`
  enterprise
    .command('install [packages...]')
    .description(
      'Install or upgrade Strapi Enterprise plugins. Without package names, choose them from a list.'
    )
    .addOption(
      new Option(
        '--registry <url>',
        'URL of another Enterprise registry, for internal tests'
      ).hideHelp()
    )
    .action(
      runAction(
        'enterprise:install',
        (packages: string[] | undefined, options: { registry?: string }) =>
          install(packages ?? [], options, ctx)
      )
    );

  return enterprise;
};

export { command };
