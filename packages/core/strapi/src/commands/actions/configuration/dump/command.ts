import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi configuration:dump`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('configuration:dump')
    .alias('config:dump')
    .description('Dump configurations of your application')
    .option('-f, --file <file>', 'Output file, default output is stdout')
    .option('-p, --pretty', 'Format the output JSON with indentation and line breaks', false)
    .action(runAction('configuration:dump', action));
};

export default command;
