import { forceOption } from '../../../utils/commander';
import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi plugin:build`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('plugin:build')
    .description('Bundle your strapi plugin for publishing.')
    .addOption(forceOption)
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .option('--sourcemap', 'produce sourcemaps', false)
    .option('--minify', 'minify the output', false)
    .action(getLocalScript('plugin/build-command'));
};

export default command;
