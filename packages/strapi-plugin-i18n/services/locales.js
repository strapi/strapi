'use strict';

const { isNil } = require('lodash/fp');

const { getCoreStore } = require('../utils');

const find = (...args) => strapi.query('locale', 'i18n').find(...args);

const findById = id => strapi.query('locale', 'i18n').findOne({ id });

const findByCode = code => strapi.query('locale', 'i18n').findOne({ code });

const create = locale => strapi.query('locale', 'i18n').create(locale);

const update = (params, updates) => strapi.query('locale', 'i18n').update(params, updates);

const deleteFn = ({ id }) => strapi.query('locale', 'i18n').delete({ id });

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
};
