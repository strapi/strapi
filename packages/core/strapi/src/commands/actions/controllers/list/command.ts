import { createCommand } from 'commander';
import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi controllers:list`
 */
const command: StrapiCommand = () => {
  return createCommand('controllers:list')
    .description('List all the application controllers')
    .action(runAction('controllers:list', action));
};

export default command;
