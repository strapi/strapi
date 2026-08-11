import { createCommand } from 'commander';
import { assertCwdContainsStrapiProject } from '../utils/helpers';
import type { StrapiCommand } from '../types';

/**
 * `$ strapi generate`
 */
const command: StrapiCommand = ({ argv }) => {
  return (
    createCommand('generate')
      .description('Launch the interactive API generator')
      // Arguments are forwarded as-is to the plop CLI (e.g. `strapi generate api my-api`),
      // so commander must not reject them as excess arguments.
      .allowExcessArguments(true)
      .action(() => {
        assertCwdContainsStrapiProject('generate');
        argv.splice(2, 1);

        // NOTE: this needs to be lazy loaded in order for plop to work correctly
        import('@strapi/generators').then((gen) => gen.runCLI());
      })
  );
};

export { command };
