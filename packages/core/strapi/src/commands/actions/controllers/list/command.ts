import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi controllers:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('controllers:list')
    .description('List all the application controllers')
    .action(async () => {
      const name = 'controllers/list';

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
