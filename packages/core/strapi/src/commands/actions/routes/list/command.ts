import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi routes:list``
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('routes:list')
    .description('List all the application routes')
    .action(async () => {
      const name = 'routes/list';

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
