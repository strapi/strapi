import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi middlewares:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('middlewares:list')
    .description('List all the application middlewares')
    .action(async () => {
      const name = 'middlewares/list';

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
