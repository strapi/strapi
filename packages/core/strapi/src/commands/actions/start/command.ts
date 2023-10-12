import { assertCwdContainsStrapiProject, handleScriptFail } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

/**
 * `$ strapi start`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('start')
    .description('Start your Strapi application')
    .action(async () => {
      const name = 'start';

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
