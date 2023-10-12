import { assertCwdContainsStrapiProject, handleScriptFail } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi uninstall`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('uninstall [plugins...]')
    .description('Uninstall a Strapi plugin')
    .option('-d, --delete-files', 'Delete files', false)
    .action(async (plugins, opts) => {
      const name = 'uninstall';

      assertCwdContainsStrapiProject(name);

      try {
        const { action } = await import(`./action`);
        await action(plugins, opts);
      } catch (err) {
        handleScriptFail(name, err);
      }
    });
};

export default command;
