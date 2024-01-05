import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
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
    .action((...args) => runAction('plugin:init', action)(...args, ctx));
};

export default command;
