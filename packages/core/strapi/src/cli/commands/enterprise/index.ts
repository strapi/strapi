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

  // `$ strapi enterprise install [packages...]`
  enterprise
    .command('install [packages...]')
    .description(
      'Install or upgrade Strapi Enterprise plugins. Without package names, choose them from a list.'
    )
    .action(runAction('enterprise:install', (packages: string[] = []) => install(packages, ctx)));

  return enterprise;
};

export { command };
