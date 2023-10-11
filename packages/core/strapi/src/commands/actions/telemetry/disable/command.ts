import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi telemetry:disable`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('telemetry:disable')
    .description('Disable anonymous telemetry and metadata sending to Strapi analytics')
    .action(getLocalScript('telemetry/disable'));
};

export default command;
