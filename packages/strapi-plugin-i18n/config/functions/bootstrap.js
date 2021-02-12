'use strict';

const _ = require('lodash');
const { capitalize, prop, pick } = require('lodash/fp');

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

  Object.values(strapi.models).forEach(model => {
    if (isLocalized(model)) {
      console.log('i18N is enabled for ', model.modelName);

      _.set(model, 'lifecycles.beforeCreate', async data => {
        if (!data.locale) {
          data.locale = await getDefaultLocale();
        }
      });

      _.set(model, 'lifecycles.afterCreate', async entry => {
        // if new entry doesn't have localizations set then create it

        if (entry.localizations === null) {
          const localizations = [{ locale: entry.locale, id: entry.id }];
          await strapi.query(model.uid).update({ id: entry.id }, { localizations });

          Object.assign(entry, { localizations });
        }
      });

      _.set(model, 'lifecycles.afterUpdate', async entry => {
        const toUpdate = pick(getNonLocalizedFields(model), entry);

        if (Array.isArray(entry.localizations)) {
          await Promise.all(
            entry.localizations.map(({ id }) => {
              if (id === entry.id) return Promise.resolve();
              return strapi.query(model.uid).update(
                {
                  id,
                },
                toUpdate
              );
            })
          );
        }
      });

      _.set(model, 'lifecycles.beforeFind', async () => {});
    }
  });

  // wrap content manager routes

  

  // or overwrite controllers
};

const isLocalized = model => {
  return prop('pluginOptions.i18n.localized', model) === true;
};

const getNonLocalizedFields = model => {
  Object.keys(model.attributes).filter(attributeName => {
    const attribute = model.attributes[attributeName];
    return prop('pluginOptions.i18n.localized', attribute) !== true && !!attribute.type; // exclude relations
  });
};

const getDefaultLocale = async () => {
  return 'en-US';
};
