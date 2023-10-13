import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi services:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('services:list')
    .description('List all the application services')
    .action(getLocalScript('services/list'));
};

export default command;
