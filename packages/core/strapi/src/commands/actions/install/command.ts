import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';

/**
 * `$ strapi install`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('install [plugins...]')
    .description('Install a Strapi plugin')
    .action(runAction('install', action));
};

export default command;
