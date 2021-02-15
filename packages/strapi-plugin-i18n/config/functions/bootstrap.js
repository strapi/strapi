'use strict';

const _ = require('lodash');
const { capitalize } = require('lodash/fp');
const { getService } = require('../../utils');

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

  Object.values(strapi.models).forEach(model => {
    if (getService('content-types').isLocalized(model)) {
      console.log('i18N is enabled for ', model.modelName);

      _.set(model, 'lifecycles.beforeCreate', async data => {
        if (!data.locale) {
          data.locale = await getService('locales').getDefaultLocale();
        }
      });

      _.set(model, 'lifecycles.afterCreate', async entry => {
        // if new entry doesn't have localizations then create it
        await getService('localizations').addLocalizations(entry, { model });
      });

      _.set(model, 'lifecycles.afterUpdate', async entry => {
        await getService('localizations').updateNonLocalizedFields(entry, { model });
      });
    }
  });
};
