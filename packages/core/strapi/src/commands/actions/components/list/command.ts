import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi components:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('components:list')
    .description('List all the application components')
    .action(getLocalScript('components/list'));
};

export default command;
