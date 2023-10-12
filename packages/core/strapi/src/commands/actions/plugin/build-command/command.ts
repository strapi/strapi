import { forceOption } from '../../../utils/commander';
import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi plugin:build`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('plugin:build')
    .description('Bundle your strapi plugin for publishing.')
    .addOption(forceOption)
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .action(async (...args) => {
      const name = 'plugin/build-command';

      assertCwdContainsStrapiProject(name);

      try {
        const { action } = await import(`./action`);
        await action(...args);
      } catch (err) {
        handleScriptFail(name, err);
      }
    });
};

export default command;
