import { createCommand } from 'commander';
import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi routes:list``
 */
const command: StrapiCommand = () => {
  return createCommand('routes:list')
    .description('List all the application routes')
    .action(runAction('routes:list', action));
};

export default command;
