const { map, omit } = require('lodash');
const request = require('utils/request').default;
const pluginId = require('../pluginId');


module.exports = async function didGetSecuredData() {
  const { updatePlugin } = this.props;
  
  const getData = () => new Promise((resolve, reject) => {
    request('/content-manager/models', { method: 'GET' })
      .then(({ models: { models } }) => {
        const menu = [{
          name: 'Content Types',
          links: map(omit(models, 'plugins'), (model, key) => ({
            label: model.labelPlural || model.label || key,
            destination: key,
          })),
        }];

        resolve(menu);
      })
      .catch(err => {
        strapi.notification.error('content-manager.error.model.fetch');
        reject(err);
      });
  });
  
  const menu = await getData();

  updatePlugin(pluginId, 'leftMenuSections', menu);
};
