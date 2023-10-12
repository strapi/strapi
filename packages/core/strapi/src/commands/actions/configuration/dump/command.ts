import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi configuration:dump`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('configuration:dump')
    .alias('config:dump')
    .description('Dump configurations of your application')
    .option('-f, --file <file>', 'Output file, default output is stdout')
    .option('-p, --pretty', 'Format the output JSON with indentation and line breaks', false)
    .action(async (...args) => {
      const name = 'configuration/dump';

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
