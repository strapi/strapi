import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi hooks:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('hooks:list')
    .description('List all the application hooks')
    .action(getLocalScript('hooks/list'));
};

export default command;
