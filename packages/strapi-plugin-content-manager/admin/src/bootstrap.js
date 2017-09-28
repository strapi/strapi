import { generateMenu } from 'containers/App/sagas';

// This method is executed before the load of the plugin
const bootstrap = (plugin) => new Promise((resole, reject) => {
  generateMenu()
    .then(menu => {
      plugin.leftMenuSections = menu;

      resole(plugin);
    })
    .catch(e => reject(e));
});

export default bootstrap;
