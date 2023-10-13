import { getLocalScript } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi uninstall`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('uninstall [plugins...]')
    .description('Uninstall a Strapi plugin')
    .option('-d, --delete-files', 'Delete files', false)
    .action(getLocalScript('uninstall'));
};

export default command;
