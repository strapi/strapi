import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi content-types:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('content-types:list')
    .description('List all the application content-types')
    .action(runAction('content-types:list', action));
};

export default command;
