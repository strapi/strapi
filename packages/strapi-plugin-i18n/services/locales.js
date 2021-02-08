'use strict';

const getStore = () =>
  strapi.store({
    environment: '',
    type: 'plugin',
    name: 'i18n',
  });

const find = (...args) => strapi.query('locale', 'i18n').find(...args);

const findById = id => strapi.query('locale', 'i18n').findOne({ id });

const findByCode = code => strapi.query('locale', 'i18n').findOne({ code });

const create = async (locale, { isDefault }) => {
  const createdLocale = await strapi.query('locale', 'i18n').create(locale);

  if (isDefault) {
    await getStore().set({ key: 'default_locale', value: locale.code });
  }

  return createdLocale;
};

const update = async (params, updates, { isDefault }) => {
  const updatedLocale = await strapi.query('locale', 'i18n').update(params, updates);

  if (isDefault) {
    await getStore().set({ key: 'default_locale', value: updatedLocale.code });
  }

  return updatedLocale;
};

module.exports = {
  find,
  findById,
  findByCode,
  create,
  update,
};
