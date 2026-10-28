import type { Plugin } from '@strapi/types';
import autosave from './autosave';
import history from './history';
import preview from './preview';
import { createContentManagerConfigurationRenamer } from './services/configuration/rename-fields';

const register: Plugin.LoadedPlugin['register'] = async ({ strapi }) => {
  // Before user migrations run, so a generated rename migration can rewrite the
  // saved layouts and leave the old-to-new map for each admin's browser.
  strapi.db.schema.registerAttributeRenameHandler(
    createContentManagerConfigurationRenamer({ strapi })
  );

  await autosave.register?.({ strapi });
  await history.register?.({ strapi });
  await preview.register?.({ strapi });
};

export default register;
