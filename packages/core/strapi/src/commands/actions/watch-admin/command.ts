import { createCommand } from 'commander';
import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';
/**
 * `$ strapi watch-admin`
 */
const command: StrapiCommand = () => {
  return createCommand('watch-admin')
    .option('--browser <name>', 'Open the browser', true)
    .description('Start the admin development server')
    .action(runAction('watch-admin', action));
};

export default command;
