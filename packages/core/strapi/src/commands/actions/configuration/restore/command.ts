import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi configuration:restore`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('configuration:restore')
    .alias('config:restore')
    .description('Restore configurations of your application')
    .option('-f, --file <file>', 'Input file, default input is stdin')
    .option('-s, --strategy <strategy>', 'Strategy name, one of: "replace", "merge", "keep"')
    .action(runAction('configuration:restore', action));
};

export default command;
