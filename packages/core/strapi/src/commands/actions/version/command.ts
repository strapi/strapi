/* eslint-disable @typescript-eslint/no-var-requires */
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi version`
 */
const command: StrapiCommand = async ({ command }) => {
  // load the Strapi package.json to get version and other information
  const packageJSON = await import('../../../../package.json');

  command.version(packageJSON.version, '-v, --version', 'Output the version number');
  command
    .command('version')
    .description('Output the version of Strapi')
    .action(() => {
      process.stdout.write(`${packageJSON.version}\n`);
      process.exit(0);
    });
};

export default command;
