import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi telemetry:disable`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('telemetry:disable')
    .description('Disable anonymous telemetry and metadata sending to Strapi analytics')
    .action(runAction('telemetry:disable', action));
};

export default command;
