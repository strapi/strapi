// This method is executed before the load of the plugin
const bootstrap = (plugin) => new Promise(resolve => {
  // TODO add with saga
  plugin.hasAdminUser = true;
  plugin.nonProtectedUrl = '/plugins/users-permissions/auth';
  
  return resolve(plugin);
});

export default bootstrap;
