'use strict';

const _ = require('lodash');
const { capitalize, prop } = require('lodash/fp');

const actions = ['create', 'read', 'update', 'delete'].map(uid => ({
  section: 'settings',
  category: 'Internationalization',
  subCategory: 'Locales',
  pluginName: 'i18n',
  displayName: capitalize(uid),
  uid: `locale.${uid}`,
}));

module.exports = () => {
  const { actionProvider } = strapi.admin.services.permission;
  actionProvider.register(actions);

  // register custom permissions

  // register database mixin to modify model behaviours

  // update model lifecycles

  // create the localization of the object & link it to the other localizations it has

  Object.values(strapi.contentTypes).forEach(contentType => {
    if (prop('pluginOptions.i18n.enabled')(contentType) === true) {
      console.log('i18N is enabled for ', contentType.modelName);

      const model = strapi.getModel(contentType.uid);

      _.set(model, 'lifecycles.beforeCreate', async () => {});

      _.set(model, 'lifecycles.afterCreate', async () => {});

      _.set(model, 'lifecycles.beforeFind', async () => {});
    }
  });

  // wrap content manager routes

  strapi.plugin('content-manager').config.routes.forEach(() => {
    // add a policy to the route we want to extend
  });

  // or overwrite controllers
};
