'use strict';

const utils = require('@strapi/utils');
const { pick } = require('lodash/fp');
const { getService } = require('../utils');
const { validateCreateLocaleInput, validateUpdateLocaleInput } = require('../validation/locales');
const { formatLocale } = require('../domain/locale');

const { setCreatorFields, sanitize } = utils;
const { ApplicationError } = utils.errors;

const sanitizeLocale = (locale) => {
  const model = strapi.getModel('plugin::i18n.locale');

  return sanitize.contentAPI.output(locale, model);
};

module.exports = {
  async listLocales(ctx) {
    const localesService = getService('locales');

    const locales = await localesService.find();
    const sanitizedLocales = await sanitizeLocale(locales);

    ctx.body = await localesService.setIsDefault(sanitizedLocales);
  },

  async createLocale(ctx) {
    const { user } = ctx.state;
    const { body } = ctx.request;
    const { isDefault, ...localeToCreate } = body;

    await validateCreateLocaleInput(body);

    const localesService = getService('locales');

    const existingLocale = await localesService.findByCode(body.code);
    if (existingLocale) {
      throw new ApplicationError('This locale already exists');
    }

    const localeToPersist = setCreatorFields({ user })(formatLocale(localeToCreate));

    const locale = await localesService.create(localeToPersist);

    getService('metrics').sendDidUpdateI18nLocalesEvent(user);

    if (isDefault) {
      await localesService.setDefaultLocale(locale);
    }

    const sanitizedLocale = await sanitizeLocale(locale);

    ctx.body = await localesService.setIsDefault(sanitizedLocale);
  },

  async updateLocale(ctx) {
    const { user } = ctx.state;
    const { id } = ctx.params;
    const { body } = ctx.request;
    const { isDefault, ...updates } = body;

    await validateUpdateLocaleInput(body);

    const localesService = getService('locales');

    const existingLocale = await localesService.findById(id);
    if (!existingLocale) {
      return ctx.notFound('locale.notFound');
    }

    const allowedParams = ['name'];
    const cleanUpdates = setCreatorFields({ user, isEdition: true })(pick(allowedParams, updates));

    const updatedLocale = await localesService.update({ id }, cleanUpdates);

    getService('metrics').sendDidUpdateI18nLocalesEvent(user);

    if (isDefault) {
      await localesService.setDefaultLocale(updatedLocale);
    }

    const sanitizedLocale = await sanitizeLocale(updatedLocale);

    ctx.body = await localesService.setIsDefault(sanitizedLocale);
  },

  async deleteLocale(ctx) {
    const { id } = ctx.params;

    const localesService = getService('locales');

    const existingLocale = await localesService.findById(id);
    if (!existingLocale) {
      return ctx.notFound('locale.notFound');
    }

    const defaultLocaleCode = await localesService.getDefaultLocale();
    if (existingLocale.code === defaultLocaleCode) {
      throw new ApplicationError('Cannot delete the default locale');
    }

    await localesService.delete({ id });

    getService('metrics').sendDidUpdateI18nLocalesEvent(ctx.state?.user);

    const sanitizedLocale = await sanitizeLocale(existingLocale);

    ctx.body = await localesService.setIsDefault(sanitizedLocale);
  },
};
