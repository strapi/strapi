import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 *`$ strapi templates:generate <directory>`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('templates:generate <directory>')
    .description('Generate template from Strapi project')
    .action(getLocalScript('templates/generate'));
};

export default command;
