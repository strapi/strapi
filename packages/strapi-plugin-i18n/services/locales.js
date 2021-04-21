'use strict';

const { isNil } = require('lodash/fp');
const { DEFAULT_LOCALE } = require('../constants');
const { getService } = require('../utils');

const { getCoreStore } = require('../utils');

const find = (...args) => strapi.query('locale', 'i18n').find(...args);

const findById = id => strapi.query('locale', 'i18n').findOne({ id });

const findByCode = code => strapi.query('locale', 'i18n').findOne({ code });

const count = params => strapi.query('locale', 'i18n').count(params);

const create = async locale => {
  const result = await strapi.query('locale', 'i18n').create(locale);

  getService('metrics').sendDidUpdateI18nLocalesEvent();

  return result;
};

const update = async (params, updates) => {
  const result = await strapi.query('locale', 'i18n').update(params, updates);

  getService('metrics').sendDidUpdateI18nLocalesEvent();

  return result;
};

const deleteFn = async ({ id }) => {
  const localeToDelete = await strapi.query('locale', 'i18n').findOne({ id });

  if (localeToDelete) {
    await deleteAllLocalizedEntriesFor({ locale: localeToDelete.code });
    const result = await strapi.query('locale', 'i18n').delete({ id });

    getService('metrics').sendDidUpdateI18nLocalesEvent();

    return result;
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
  const { isLocalizedContentType } = getService('content-types');

  const localizedModels = Object.values(strapi.contentTypes).filter(isLocalizedContentType);

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
  count,
  setDefaultLocale,
  getDefaultLocale,
  setIsDefault,
  delete: deleteFn,
  initDefaultLocale,
};
