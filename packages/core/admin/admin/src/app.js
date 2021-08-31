export default {
  config: {},
  bootstrap(app) {
    app.injectContentManagerComponent('editView', 'informations', {
      name: 'i18n-locale-filter-edit-view',
      Component: () => 'test',
    });
  },
};
