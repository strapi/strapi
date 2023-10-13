import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi controllers:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('controllers:list')
    .description('List all the application controllers')
    .action(getLocalScript('controllers/list'));
};

export default command;
