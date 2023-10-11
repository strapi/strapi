import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi routes:list``
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('routes:list')
    .description('List all the application routes')
    .action(getLocalScript('routes/list'));
};

export default command;
