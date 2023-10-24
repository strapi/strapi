import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi services:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('services:list')
    .description('List all the application services')
    .action(runAction('services:list', action));
};

export default command;
