import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 *`$ strapi templates:generate <directory>`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('templates:generate <directory>')
    .description('Generate template from Strapi project')
    .action(async (args) => {
      const name = 'templates/generate';

      assertCwdContainsStrapiProject(name);

      try {
        const { action } = await import(`./action`);
        await action(args);
      } catch (err) {
        handleScriptFail(name, err);
      }
    });
};

export default command;
