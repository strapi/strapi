import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi services:list`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('services:list')
    .description('List all the application services')
    .action(async () => {
      const name = 'services/list';

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
