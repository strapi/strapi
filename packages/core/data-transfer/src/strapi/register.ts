import { routes } from './remote';

/**
 * This is intended to be called on Strapi register phase.
 *
 * It registers a transfer route in the Strapi admin router.
 */
const register = (strapi: Strapi.Strapi) => {
  routes.registerAdminTransferRoute(strapi);
};

export default register;
