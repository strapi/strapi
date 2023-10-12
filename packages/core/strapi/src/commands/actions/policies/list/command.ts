import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi policies:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('policies:list')
    .description('List all the application policies')
    .action(async () => {
      const name = 'policies/list';

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
