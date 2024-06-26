import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi telemetry:enable`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('telemetry:enable')
    .description('Enable anonymous telemetry and metadata sending to Strapi analytics')
    .action(runAction('telemetry:enable', action));
};

export default command;
