import { assertCwdContainsStrapiProject, handleScriptFail } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi console`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('console')
    .description('Open the Strapi framework console')
    .action(async () => {
      const name = 'console';

      assertCwdContainsStrapiProject(name);

      try {
        const { action } = await import(`./action`);
        await action();
      } catch (err) {
        handleScriptFail(name, err);
      }
    });
};

export default command;
