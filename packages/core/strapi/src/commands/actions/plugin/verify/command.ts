import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi plugin:verify`
 */
const command: StrapiCommand = ({ command, ctx }) => {
  command
    .command('plugin:verify')
    .description('Verify the output of your plugin before publishing it.')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('plugin:verify', action)(...args, ctx));
};

export default command;
