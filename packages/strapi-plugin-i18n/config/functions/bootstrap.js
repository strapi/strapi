'use strict';

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

module.exports = async () => {
  const { actionProvider } = strapi.admin.services.permission;
  actionProvider.register(actions);

  await getService('locales').initDefaultLocale();

  Object.values(strapi.models)
    .filter(model => getService('content-types').isLocalized(model))
    .forEach(model => {
      strapi.db.lifecycles.register({
        model: model.uid,
        async beforeCreate(data) {
          await getService('localizations').assignDefaultLocale(data);
        },
        async afterCreate(entry) {
          await getService('localizations').addLocalizations(entry, { model });
        },
        async afterUpdate(entry) {
          await getService('localizations').updateNonLocalizedFields(entry, { model });
        },
        async afterDelete(entry) {
          await getService('localizations').removeEntryFromRelatedLocalizations(entry, { model });
        },
      });
    });
};
