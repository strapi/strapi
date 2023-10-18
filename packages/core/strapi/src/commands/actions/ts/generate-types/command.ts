import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi ts:generate-types`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('ts:generate-types')
    .description(`Generate TypeScript typings for your schemas`)
    .option('--verbose', `[DEPRECATED] The verbose option has been replaced by debug`, false)
    .option('-d, --debug', `Run the generation with debug messages`, false)
    .option('-s, --silent', `Run the generation silently, without any output`, false)
    .option(
      '-o, --out-dir <outDir>',
      'Specify a relative root directory in which the definitions will be generated. Changing this value might break types exposed by Strapi that relies on generated types.'
    )
    .action(runAction('ts:generate-types', action));
};

export default command;
