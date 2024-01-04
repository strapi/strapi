import { createCommand } from 'commander';
import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi policies:list`
 */
const command: StrapiCommand = () => {
  return createCommand('policies:list')
    .description('List all the application policies')
    .action(runAction('policies:list', action));
};

export default command;
