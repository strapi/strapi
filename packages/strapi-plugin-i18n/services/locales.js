'use strict';

const { getCoreStore } = require('../utils');

const find = (...args) => strapi.query('locale', 'i18n').find(...args);

const findById = id => strapi.query('locale', 'i18n').findOne({ id });

const findByCode = code => strapi.query('locale', 'i18n').findOne({ code });

const create = locale => strapi.query('locale', 'i18n').create(locale);

const update = (params, updates) => strapi.query('locale', 'i18n').update(params, updates);

const setDefaultLocale = ({ code }) => getCoreStore().set({ key: 'default_locale', value: code });

module.exports = {
  find,
  findById,
  findByCode,
  create,
  update,
  setDefaultLocale,
};
