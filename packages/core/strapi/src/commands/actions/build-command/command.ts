import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';

/**
 * `$ strapi build`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('build')
    .option('--no-optimization', 'Build the admin app without optimizing assets')
    .description('Build the strapi admin app')
    .action(runAction('build', action)); // build-command dir to avoid problems with 'build' being commonly ignored
};

export default command;
