const pluginId = require('../pluginId');

module.exports = function didGetSecuredData() {
  const { store, updatePlugin } = this.props;
  const initializerReducer = store
    .getState()
    .getIn(['content-manager_initializer']);
  const menu = initializerReducer.get('menu');

  updatePlugin(pluginId, 'leftMenuSections', menu);
};
