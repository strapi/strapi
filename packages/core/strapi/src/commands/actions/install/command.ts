import { assertCwdContainsStrapiProject, handleScriptFail } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi install`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('install [plugins...]')
    .description('Install a Strapi plugin')
    .action(async (plugins) => {
      const name = 'install';

      assertCwdContainsStrapiProject(name);

      try {
        const { action } = await import(`./action`);
        await action(plugins);
      } catch (err) {
        handleScriptFail(name, err);
      }
    });
};

export default command;
