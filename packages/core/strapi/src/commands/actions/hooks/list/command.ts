import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi hooks:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('hooks:list')
    .description('List all the application hooks')
    .action(async () => {
      const name = 'hooks/list';

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
