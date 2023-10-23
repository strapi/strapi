import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';

/**
 * `$ strapi develop`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('develop')
    .alias('dev')
    .option('--no-build', 'Disable build')
    .option('--watch-admin', 'Enable watch', false)
    .option('--polling', 'Watch for file changes in network directories', false)
    .option('--browser <name>', 'Open the browser', true)
    .description('Start your Strapi application in development mode')
    .action(runAction('develop', action));
};

export default command;
