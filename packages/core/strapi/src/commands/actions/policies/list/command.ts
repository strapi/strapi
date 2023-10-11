import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi policies:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('policies:list')
    .description('List all the application policies')
    .action(getLocalScript('policies/list'));
};

export default command;
