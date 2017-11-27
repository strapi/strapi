import request from 'utils/request';
// This method is executed before the load of the plugin
const bootstrap = (plugin) => new Promise((resolve, reject) => {
  request('/users-permissions/init')
    .then(response => {
      plugin.hasAdminUser = response.hasAdmin;
      plugin.nonProtectedUrl = '/plugins/users-permissions/auth';

      // Add Users to Content Types section.
      plugin.leftMenuSections.push({
        links: [{
          label: 'Users',
          destination: 'user',
          plugin: 'content-manager',
        }],
        name: 'Content Types',
      });

      return resolve(plugin);
    })
    .catch(err => reject(err));
});

export default bootstrap;
