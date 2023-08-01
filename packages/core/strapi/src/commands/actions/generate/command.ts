import { runCLI } from '@strapi/generators';
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
      runCLI();
    });
};

export default commands;
