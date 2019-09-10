// const pluginId = require('../pluginId');
import pluginId from '../pluginId';

function didGetSecuredData() {
  const {
    props: { updatePlugin },
  } = this;
  const leftMenuSections = [
    {
      links: [
        {
          label: 'Users',
          destination: 'user',
          plugin: 'content-manager',
        },
      ],
      name: 'Content Types',
    },
  ];

  updatePlugin(pluginId, 'leftMenuSections', leftMenuSections);
}

export default didGetSecuredData;
