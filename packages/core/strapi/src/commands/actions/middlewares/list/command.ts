import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi middlewares:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('middlewares:list')
    .description('List all the application middlewares')
    .action(getLocalScript('middlewares/list'));
};

export default command;
