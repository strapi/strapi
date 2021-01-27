'use strict';

const find = (...args) => strapi.query('locale', 'i18n').find(...args);

const findById = id => strapi.query('locale', 'i18n').findOne({ id });

const findByCode = code => strapi.query('locale', 'i18n').findOne({ code });

const create = locale => strapi.query('locale', 'i18n').create(locale);

const update = (params, updates) => strapi.query('locale', 'i18n').update(params, updates);

module.exports = {
  find,
  findById,
  findByCode,
  create,
  update,
};
