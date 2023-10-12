import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi telemetry:enable`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('telemetry:enable')
    .description('Enable anonymous telemetry and metadata sending to Strapi analytics')
    .action(async () => {
      const name = 'telemetry/enable';

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
