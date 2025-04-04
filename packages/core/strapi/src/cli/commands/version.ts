import { createCommand } from 'commander';
import type { StrapiCommand } from '../types';
import { version } from '../../../package.json';

/**
 * `$ strapi version`
 */

const command: StrapiCommand = () => {
  // load the Strapi package.json to get version and other information
  return createCommand('version')
    .description('Output the version of Strapi')
    .action(() => {
      process.stdout.write(`${version}\n`);
      process.exit(0);
    });
};

export { command };
