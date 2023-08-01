import { getLocalScript } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

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
    .action(getLocalScript('configuration/restore'));
};

export default command;
