import { createCommand } from 'commander';
import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi hooks:list`
 */
const command: StrapiCommand = () => {
  return createCommand('hooks:list')
    .description('List all the application hooks')
    .action(runAction('hooks:list', action));
};

export default command;
