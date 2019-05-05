/*
 *
 * SET THE HOOKS TO ENABLE THE MAGIC OF STRAPI.
 * -------------------------------------------
 *
 * Secure, customise and enhance your project by setting
 * the hooks via this file.
 *
 */

import didGetSecuredData from './lifecycles/didGetSecuredData';

function lifecycles() {
  // Set hooks for the AdminPage container.
  // Note: we don't need to specify the first argument because we already know what "willSecure" refers to.
  this.setHooks({
    didGetSecuredData,
  });
}

export default lifecycles;
