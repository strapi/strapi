import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';

/**
 * `$ strapi uninstall`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('uninstall [plugins...]')
    .description('Uninstall a Strapi plugin')
    .option('-d, --delete-files', 'Delete files', false)
    .action(runAction('uninstall', action));
};

export default command;
