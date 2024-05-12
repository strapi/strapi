import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi plugin:watch:link`
 */
const command: StrapiCommand = ({ command, ctx }) => {
  command
    .command('plugin:watch:link')
    .description('Recompiles your plugin automatically on changes and runs yalc push --publish')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('plugin:watch:link', action)(...args, ctx));
};

export default command;
