import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';

/**
 * `$ strapi console`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('console')
    .description('Open the Strapi framework console')
    .action(runAction('console', action));
};

export default command;
