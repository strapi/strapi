import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 *`$ strapi templates:generate <directory>`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('templates:generate <directory>')
    .description('Generate template from Strapi project')
    .action(runAction('templates:generate', action));
};

export default command;
