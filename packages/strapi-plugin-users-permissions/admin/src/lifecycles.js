/*
 *
 * SET THE HOOKS TO ENABLE THE MAGIC OF STRAPI.
 * -------------------------------------------
 *
 * Secure, customise and enhance your project by setting
 * the hooks via this file.
 *
 */

function lifecycles() {
  // TODO: Make it work and remove it when the split-admin PR has been merged
  // const componentsToAdd = [
  //   {
  //     area: 'NavRight',
  //     key: 'UsersPermissionsLogout',
  //     mainComponent: require('./components/Logout').default,
  //   },
  // ];
  // this.setComponents(componentsToAdd);
  // Set hooks for the AdminPage container.
  // Note: we don't need to specify the first argument because we already know what "willSecure" refers to.
  // Set hooks for the App container of the Content Manager.
  // Note: we have to specify the first argument to select a specific container which is located in a plugin, or not.
  // this.setHooks('content-manager.App', {
  //   willSomething: (props, store) => { console.log("Do Something"); }
  // });
}

export default lifecycles;
