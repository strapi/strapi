import { getLocalScript } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

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
    .action(getLocalScript('develop'));
};

export default command;
