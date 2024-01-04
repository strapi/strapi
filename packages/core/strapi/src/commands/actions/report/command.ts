import { createCommand } from 'commander';
import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';

/**
 * `$ strapi report`
 */
const command: StrapiCommand = () => {
  return createCommand('report')
    .description('Get system stats for debugging and submitting issues')
    .option('-u, --uuid', 'Include Project UUID')
    .option('-d, --dependencies', 'Include Project Dependencies')
    .option('--all', 'Include All Information')
    .action(runAction('report', action));
};

export default command;
