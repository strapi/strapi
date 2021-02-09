'use strict';

const { prop, isNil } = require('lodash/fp');

const getCoreStore = () =>
  strapi.store({
    environment: '',
    type: 'plugin',
    name: 'i18n',
  });

// retrieve a local service
const getService = name => {
  return prop(`i18n.services.${name}`, strapi.plugins);
};

const setIsDefault = async locales => {
  if (isNil(locales)) {
    return locales;
  }

  const actualDefault = await getCoreStore().get({ key: 'default_locale' });

  if (Array.isArray(locales)) {
    return locales.map(locale => ({ ...locale, isDefault: actualDefault === locale.code }));
  } else {
    // single locale
    return { ...locales, isDefault: actualDefault === locales.code };
  }
};

module.exports = {
  getService,
  setIsDefault,
  getCoreStore,
};
