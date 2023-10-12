import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi admin:reset-user-password`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('admin:reset-user-password')
    .alias('admin:reset-password')
    .description("Reset an admin user's password")
    .option('-e, --email <email>', 'The user email')
    .option('-p, --password <password>', 'New password for the user')
    .action(async (...args) => {
      const name = 'admin/reset-user-password';

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
