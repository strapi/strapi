import { request } from 'strapi-helper-plugin';
import pluginId from '../pluginId';

// TODO: update needs to be updated when the models are retrieved from the admin.

async function didGetSecuredData() {
  const { updatePlugin } = this.props;
  const requestURL = `/${pluginId}/fixtures/models`;

  try {
    const { models } = await request(requestURL, { method: 'GET' });
    const menu = [
      {
        name: 'Content Types',
        links: models,
        // links: map(omit(models, 'plugins'), (model, key) => ({
        //   label: model.labelPlural || model.label || key,
        //   destination: key,
        // })),
      },
    ];

    updatePlugin(pluginId, 'leftMenuSections', menu);
  } catch (err) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

export default didGetSecuredData;
