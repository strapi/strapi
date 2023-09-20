import { assertCwdContainsStrapiProject } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi generate`
 */
const commands: StrapiCommand = ({ command, argv }) => {
  command
    .command('generate')
    .description('Launch the interactive API generator')
    .action(() => {
      assertCwdContainsStrapiProject('generate');
      argv.splice(2, 1);

      // NOTE: this needs to be lazy loaded in order for plop to work correctly
      import('@strapi/generators').then((gen) => gen.runCLI());
    });
};

export default commands;
