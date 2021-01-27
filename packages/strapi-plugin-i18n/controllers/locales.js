'use strict';

const { setCreatorFields, sanitizeEntity } = require('strapi-utils');
const { getService } = require('../utils');
const { validateCreateLocaleInput, validateUpdateLocaleInput } = require('../validation/locales');
const { formatLocale } = require('../domain/locale');

const listLocales = async ctx => {
  const localesService = getService('locales');

  const locales = await localesService.find();

  const model = strapi.getModel('locale', 'i18n');
  ctx.body = sanitizeEntity(locales, { model });
};

const createLocale = async ctx => {
  const { user } = ctx.state;
  const { body } = ctx.request;

  try {
    await validateCreateLocaleInput(body);
  } catch (err) {
    return ctx.badRequest('ValidationError', err);
  }

  const localesService = getService('locales');
  const model = strapi.getModel('locale', 'i18n');

  const existingLocale = await localesService.findByCode(body.code);
  if (existingLocale) {
    return ctx.badRequest('This locale already exists');
  }

  let localeToCreate = formatLocale(body);
  localeToCreate = setCreatorFields({ user })(localeToCreate);

  const locale = await localesService.create(localeToCreate);

  ctx.body = sanitizeEntity(locale, { model });
};

const updateLocale = async ctx => {
  const { user } = ctx.state;
  const { id } = ctx.params;
  const { body } = ctx.request;

  try {
    await validateUpdateLocaleInput(body);
  } catch (err) {
    return ctx.badRequest('ValidationError', err);
  }

  const localesService = getService('locales');
  const model = strapi.getModel('locale', 'i18n');

  const existingLocale = await localesService.findById(id);
  if (!existingLocale) {
    return ctx.notFound('locale.notFound');
  }

  let updates = { name: body.name };
  updates = setCreatorFields({ user, isEdition: true })(updates);

  const updatedLocale = await localesService.update({ id }, updates);

  ctx.body = sanitizeEntity(updatedLocale, { model });
};

module.exports = {
  listLocales,
  createLocale,
  updateLocale,
};
