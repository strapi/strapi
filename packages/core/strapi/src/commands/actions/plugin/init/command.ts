import type { StrapiCommand } from '../../../types';
import action from './action';

/**
 * `$ strapi plugin:init`
 */
const command: StrapiCommand = ({ command, ctx }) => {
  command
    .command('plugin:init')
    .description('Create a new plugin at a given path')
    .argument('[path]', 'path to the plugin', './src/plugins/my-plugin')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((path, options) => {
      return action(path, options, ctx);
    });
};

export default command;
