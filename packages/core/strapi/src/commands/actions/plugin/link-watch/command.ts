import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi plugin:link-watch`
 */
const command: StrapiCommand = ({ command, ctx }) => {
  command
    .command('plugin:link-watch')
    .description('Recompiles your plugin automatically on changes and runs yalc push --publish')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('plugin:link-watch', action)(...args, ctx));
};

export default command;
