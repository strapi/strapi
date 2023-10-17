import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi components:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('components:list')
    .description('List all the application components')
    .action(runAction('components:list', action));
};

export default command;
