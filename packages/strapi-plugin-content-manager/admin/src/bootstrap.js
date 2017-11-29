import { generateMenu } from 'containers/App/sagas';

// This method is executed before the load of the plugin
const bootstrap = (plugin) => new Promise((resolve, reject) => {
  generateMenu()
    .then(menu => {
      plugin.leftMenuSections = menu;
      resolve(plugin);
    })
    .catch(e => reject(e));
});

export default bootstrap;
