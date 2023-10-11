import { getLocalScript } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi console`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('console')
    .description('Open the Strapi framework console')
    .action(getLocalScript('console'));
};

export default command;
