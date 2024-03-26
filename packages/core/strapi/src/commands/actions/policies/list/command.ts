import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi policies:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('policies:list')
    .description('List all the application policies')
    .action(runAction('policies:list', action));
};

export default command;
