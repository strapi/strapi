import { getLocalScript } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi report`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('report')
    .description('Get system stats for debugging and submitting issues')
    .option('-u, --uuid', 'Include Project UUID')
    .option('-d, --dependencies', 'Include Project Dependencies')
    .option('--all', 'Include All Information')
    .action(getLocalScript('report'));
};

export default command;
