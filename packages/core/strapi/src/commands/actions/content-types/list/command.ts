import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi content-types:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('content-types:list')
    .description('List all the application content-types')
    .action(getLocalScript('content-types/list'));
};

export default command;
