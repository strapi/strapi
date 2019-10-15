/*
 *
 * SET THE HOOKS TO ENABLE THE MAGIC OF STRAPI.
 * -------------------------------------------
 *
 * Secure, customise and enhance your project by setting
 * the hooks via this file.
 *
 */

module.exports = function lifecycles() {
  // Set hooks for the AdminPage container.
  // Note: we don't need to specify the first argument because we already know what "willSecure" refers to.
  this.setHooks({
    didGetSecuredData: () => console.log('do something'),
  });

  // Set hooks for the App container of the Content Manager.
  // Note: we have to specify the first argument to select a specific container which is located in a plugin, or not.
  // this.setHooks('content-manager.App', {
  //   willSomething: () => { console.log("Do Something"); }
  // });
};
