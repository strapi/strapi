import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi components:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('components:list')
    .description('List all the application components')
    .action(async () => {
      const name = 'components/list';

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
