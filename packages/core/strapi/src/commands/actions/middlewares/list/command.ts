import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi middlewares:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('middlewares:list')
    .description('List all the application middlewares')
    .action(runAction('middlewares:list', action));
};

export default command;
