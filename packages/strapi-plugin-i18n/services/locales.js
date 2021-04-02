'use strict';

const { isNil } = require('lodash/fp');
const { DEFAULT_LOCALE } = require('../constants');
const { getService } = require('../utils');

const { getCoreStore } = require('../utils');

const find = (...args) => strapi.query('locale', 'i18n').find(...args);

const findById = id => strapi.query('locale', 'i18n').findOne({ id });

const findByCode = code => strapi.query('locale', 'i18n').findOne({ code });

const create = locale => strapi.query('locale', 'i18n').create(locale);

const update = (params, updates) => strapi.query('locale', 'i18n').update(params, updates);

const deleteFn = async ({ id }) => {
  const localeToDelete = await strapi.query('locale', 'i18n').findOne({ id });

  if (localeToDelete) {
    await deleteAllLocalizedEntriesFor({ locale: localeToDelete.code });
    return strapi.query('locale', 'i18n').delete({ id });
  }
  return localeToDelete;
};

const setDefaultLocale = ({ code }) => getCoreStore().set({ key: 'default_locale', value: code });

const getDefaultLocale = () => getCoreStore().get({ key: 'default_locale' });

const setIsDefault = async locales => {
  if (isNil(locales)) {
    return locales;
  }

  const actualDefault = await getDefaultLocale();

  if (Array.isArray(locales)) {
    return locales.map(locale => ({ ...locale, isDefault: actualDefault === locale.code }));
  } else {
    // single locale
    return { ...locales, isDefault: actualDefault === locales.code };
  }
};

const initDefaultLocale = async () => {
  const existingLocalesNb = await strapi.query('locale', 'i18n').count();
  if (existingLocalesNb === 0) {
    await create(DEFAULT_LOCALE);
    await setDefaultLocale({ code: DEFAULT_LOCALE.code });
  }
};

const deleteAllLocalizedEntriesFor = async ({ locale }) => {
  const { isLocalized } = getService('content-types');

  const localizedModels = Object.values(strapi.contentTypes).filter(isLocalized);

  for (const model of localizedModels) {
    await strapi.query(model.uid).delete({ locale }, { returning: false });
  }
};

module.exports = {
  find,
  findById,
  findByCode,
  create,
  update,
  setDefaultLocale,
  getDefaultLocale,
  setIsDefault,
  delete: deleteFn,
  initDefaultLocale,
};
