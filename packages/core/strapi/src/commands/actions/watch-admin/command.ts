import { assertCwdContainsStrapiProject, handleScriptFail } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi watch-admin`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('watch-admin')
    .option('--browser <name>', 'Open the browser', true)
    .description('Start the admin development server')
    .action(async (args) => {
      const name = 'watch-admin';

      assertCwdContainsStrapiProject(name);

      try {
        const { action } = await import(`./action`);
        await action(args);
      } catch (err) {
        handleScriptFail(name, err);
      }
    });
};

export default command;
