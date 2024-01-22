import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';
/**
 * `$ strapi watch-admin`
 */
const command: StrapiCommand = ({ command, ctx }) => {
  command
    .command('watch-admin')
    .option('--browser <name>', 'Open the browser', true)
    .description('Start the admin development server')
    .action((...args) => runAction('watch-admin', action)(...args, ctx));
};
export default command;
