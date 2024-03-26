import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi routes:list``
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('routes:list')
    .description('List all the application routes')
    .action(runAction('routes:list', action));
};

export default command;
