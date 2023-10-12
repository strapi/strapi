import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi content-types:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('content-types:list')
    .description('List all the application content-types')
    .action(async () => {
      const name = 'content-types/list';

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
