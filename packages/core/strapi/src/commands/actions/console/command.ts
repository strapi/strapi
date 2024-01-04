import { createCommand } from 'commander';
import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';

/**
 * `$ strapi console`
 */
const command: StrapiCommand = () => {
  return createCommand('console')
    .description('Open the Strapi framework console')
    .action(runAction('console', action));
};

export default command;
