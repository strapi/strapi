import { getLocalScript } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi start`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('start')
    .description('Start your Strapi application')
    .action(getLocalScript('start'));
};

export default command;
