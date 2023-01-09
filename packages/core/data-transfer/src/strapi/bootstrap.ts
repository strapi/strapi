import { actions } from './remote';
/**
 * This is intended to be called on Strapi bootstrap phase.
 *
 * It registers the admin actions for data-transfer
 */
const bootstrap = async (strapi: Strapi.Strapi) => {
  await actions.registerAdminTransferActions(strapi);
};

export default bootstrap;
