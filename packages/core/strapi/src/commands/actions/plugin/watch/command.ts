import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi plugin:watch`
 */
const command: StrapiCommand = ({ command, ctx }) => {
  command
    .command('plugin:watch')
    .description('Watch & compile your strapi plugin for local development.')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('plugin:watch', action)(...args, ctx));
};

export default command;
