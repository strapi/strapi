const pluginId = require('../pluginId');

module.exports = function didGetSecuredData() {
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
};
