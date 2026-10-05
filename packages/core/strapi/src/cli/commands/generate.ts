import { createCommand } from 'commander';
import type { StrapiCommand } from '../types';

/**
 * `$ strapi generate`
 */
const command: StrapiCommand = ({ argv }) => {
  return createCommand('generate')
    .description('Launch the interactive API generator')
    .action(() => {
      // plop reads `process.argv` on its own and snapshots it as it loads, so the
      // `generate` argument has to be removed before then, otherwise plop looks for
      // a generator named `generate` instead of prompting for one
      argv.splice(2, 1);

      // NOTE: the import has to stay lazy so that it lands after that splice, and so
      // that plop and its prompts are kept out of the startup path of every other command
      return import('@strapi/generators').then((gen) => gen.runCLI());
    });
};

export { command };
