// const { map, omit } = require('lodash');
// const { request } = require('strapi-helper-plugin');
// const pluginId = require('../pluginId');
import { map, omit } from 'lodash';
import { request } from 'strapi-helper-plugin';
import pluginId from '../pluginId';

// TODO: update needs to be updated when the models are retrieved from the admin.

async function didGetSecuredData() {
  const { updatePlugin } = this.props;
  const requestURL = `/${pluginId}/models`;

  try {
    const {
      models: { models },
    } = await request(requestURL, { method: 'GET' });
    const menu = [
      {
        name: 'Content Types',
        links: map(omit(models, 'plugins'), (model, key) => ({
          label: model.labelPlural || model.label || key,
          destination: key,
        })),
      },
    ];

    updatePlugin(pluginId, 'leftMenuSections', menu);
  } catch (err) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

// module.exports = async function didGetSecuredData() {
//   const { updatePlugin } = this.props;
//   const requestURL = `/${pluginId}/models`;

//   try {
//     const {
//       models: { models },
//     } = await request(requestURL, { method: 'GET' });
//     const menu = [
//       {
//         name: 'Content Types',
//         links: map(omit(models, 'plugins'), (model, key) => ({
//           label: model.labelPlural || model.label || key,
//           destination: key,
//         })),
//       },
//     ];

//     updatePlugin(pluginId, 'leftMenuSections', menu);
//   } catch (err) {
//     strapi.notification.error('content-manager.error.model.fetch');
//   }
// };

// module.exports = didGetSecuredData;
export default didGetSecuredData;
