import { actions } from './remote';
/**
 * This is intended to be called on Strapi register phase.
 *
 * It registers a transfer route in the Strapi admin router.
 */
const bootstrap = async (strapi: Strapi.Strapi) => {
  await actions.registerAdminTransferActions(strapi);
};

export default bootstrap;
