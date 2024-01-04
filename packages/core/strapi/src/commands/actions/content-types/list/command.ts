import { createCommand } from 'commander';
import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi content-types:list`
 */
const command: StrapiCommand = () => {
  return createCommand('content-types:list')
    .description('List all the application content-types')
    .action(runAction('content-types:list', action));
};

export default command;
