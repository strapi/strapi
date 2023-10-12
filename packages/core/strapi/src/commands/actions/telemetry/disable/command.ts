import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi telemetry:disable`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('telemetry:disable')
    .description('Disable anonymous telemetry and metadata sending to Strapi analytics')
    .action(async () => {
      const name = 'telemetry/disable';

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
