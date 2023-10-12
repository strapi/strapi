import { assertCwdContainsStrapiProject, handleScriptFail } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi build`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('build')
    .option('--no-optimization', 'Build the admin app without optimizing assets')
    .description('Build the strapi admin app')
    .action(async (...args) => {
      const name = 'build-command';

      assertCwdContainsStrapiProject(name);

      try {
        const { action } = await import(`./action`);
        await action(...args);
      } catch (err) {
        handleScriptFail(name, err);
      }
    }); // build-command dir to avoid problems with 'build' being commonly ignored
};

export default command;
