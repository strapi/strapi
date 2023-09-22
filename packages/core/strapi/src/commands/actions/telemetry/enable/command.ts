import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi telemetry:enable`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('telemetry:enable')
    .description('Enable anonymous telemetry and metadata sending to Strapi analytics')
    .action(getLocalScript('telemetry/enable'));
};

export default command;
