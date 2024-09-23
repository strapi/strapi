import { createCommand } from 'commander';
import type { StrapiCommand } from '../types';

/**
 * `$ strapi version`
 */

const command: StrapiCommand = () => {
  // load the Strapi package.json to get version and other information
  return createCommand('version')
    .description('Output the version of Strapi')
    .action(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { version } = require('../../../package.json');

      process.stdout.write(`${version}\n`);
      process.exit(0);
    });
};

export { command };
