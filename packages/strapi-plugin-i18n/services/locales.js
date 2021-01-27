'use strict';

const find = async (...args) => {
  const locales = await strapi.query('locale', 'i18n').find(...args);

  return locales;
};

const findById = async id => {
  const locales = await strapi.query('locale', 'i18n').findOne({ id });

  return locales;
};

const findByCode = async code => {
  const locales = await strapi.query('locale', 'i18n').findOne({ code });

  return locales;
};

const create = async locale => {
  const locales = await strapi.query('locale', 'i18n').create(locale);

  return locales;
};

const update = async (params, updates) => {
  const locales = await strapi.query('locale', 'i18n').update(params, updates);

  return locales;
};

module.exports = {
  find,
  findById,
  findByCode,
  create,
  update,
};
