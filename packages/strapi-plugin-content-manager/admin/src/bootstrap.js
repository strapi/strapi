import { map, omit } from 'lodash';
import request from 'utils/request';

// This method is executed before the load of the plugin
const bootstrap = plugin =>
  new Promise((resolve, reject) => {
    request('/content-manager/models', { method: 'GET' })
      .then(models => {
        const menu = [
          {
            name: 'Content Types',
            links: map(omit(models.models.models, 'plugins'), (model, key) => ({
              label: model.labelPlural || model.label || key,
              destination: key,
            })),
          },
        ];
        plugin.leftMenuSections = menu;
        resolve(plugin);
      })
      .catch(e => {
        strapi.notification.error('content-manager.error.model.fetch');
        reject(e);
      });
  });

export default bootstrap;
