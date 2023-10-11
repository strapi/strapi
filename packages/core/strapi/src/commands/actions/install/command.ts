import { getLocalScript } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi install`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('install [plugins...]')
    .description('Install a Strapi plugin')
    .action(getLocalScript('install'));
};

export default command;
