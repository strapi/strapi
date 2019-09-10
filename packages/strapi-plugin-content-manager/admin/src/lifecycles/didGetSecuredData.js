import { request } from 'strapi-helper-plugin';
import pluginId from '../pluginId';

// TODO: update needs to be updated when the models are retrieved from the admin.

async function didGetSecuredData() {
  const { updatePlugin } = this.props;
  const requestURL = `/${pluginId}/content-types`;

  try {
    const { data } = await request(requestURL, { method: 'GET' });

    const menu = [
      {
        name: 'Content Types',
        links: data,
      },
    ];

    updatePlugin(pluginId, 'leftMenuSections', menu);
  } catch (err) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

export default didGetSecuredData;
