import { getLocalScript } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi watch-admin`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('watch-admin')
    .option('--browser <name>', 'Open the browser', true)
    .description('Start the admin development server')
    .action(getLocalScript('watch-admin'));
};

export default command;
