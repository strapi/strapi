import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi hooks:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('hooks:list')
    .description('List all the application hooks')
    .action(runAction('hooks:list', action));
};

export default command;
