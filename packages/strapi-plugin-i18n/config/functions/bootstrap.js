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

const DEFAULT_LOCALE = {
  code: 'en-US',
};

module.exports = async () => {
  const { actionProvider } = strapi.admin.services.permission;
  actionProvider.register(actions);

  const defaultLocale = await getService('locales').getDefaultLocale();
  if (!defaultLocale) {
    await getService('locales').setDefaultLocale(DEFAULT_LOCALE);
  }

  Object.values(strapi.models)
    .filter(model => getService('content-types').isLocalized(model))
    .forEach(model => {
      strapi.db.lifecycles.register({
        model: model.uid,
        async beforeCreate(data) {
          if (!data.locale) {
            data.locale = await getService('locales').getDefaultLocale();
          }
        },
        async afterCreate(entry) {
          await getService('localizations').addLocalizations(entry, { model });
        },
        async afterUpdate(entry) {
          await getService('localizations').updateNonLocalizedFields(entry, { model });
        },
        async afterDelete() {
          // TODO/ implement
          // await getService('localizations').updateDeletedLocalization(entry, { model });
        },
      });
    });
};
