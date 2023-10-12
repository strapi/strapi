import { assertCwdContainsStrapiProject, handleScriptFail } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';

/**
 * `$ strapi admin:create-user`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('admin:create-user')
    .alias('admin:create')
    .description('Create a new admin')
    .option('-e, --email <email>', 'Email of the new admin')
    .option('-p, --password <password>', 'Password of the new admin')
    .option('-f, --firstname <first name>', 'First name of the new admin')
    .option('-l, --lastname <last name>', 'Last name of the new admin')
    .action(async (...args) => {
      const name = 'admin/create-user';

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
