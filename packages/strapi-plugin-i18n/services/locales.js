'use strict';

const { setIsDefault } = require('../utils');

const getStore = () =>
  strapi.store({
    environment: '',
    type: 'plugin',
    name: 'i18n',
  });

const find = async (...args) => {
  const locales = await strapi.query('locale', 'i18n').find(...args);

  return setIsDefault(locales);
};

const findById = async id => {
  const locale = await strapi.query('locale', 'i18n').findOne({ id });

  return setIsDefault(locale);
};

const findByCode = async code => {
  const locale = await strapi.query('locale', 'i18n').findOne({ code });

  return setIsDefault(locale);
};

const create = async (locale, { isDefault }) => {
  const createdLocale = await strapi.query('locale', 'i18n').create(locale);

  if (isDefault) {
    await getStore().set({ key: 'default_locale', value: locale.code });
  }

  return setIsDefault(createdLocale);
};

const update = async (params, updates, { isDefault }) => {
  const updatedLocale = await strapi.query('locale', 'i18n').update(params, updates);

  if (isDefault) {
    await getStore().set({ key: 'default_locale', value: updatedLocale.code });
  }

  return setIsDefault(updatedLocale);
};

module.exports = {
  find,
  findById,
  findByCode,
  create,
  update,
};
