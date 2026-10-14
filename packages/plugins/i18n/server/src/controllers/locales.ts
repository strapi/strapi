import * as utils from '@strapi/utils';
import { pick } from 'lodash';
import type { Core } from '@strapi/types';
import { getService } from '../utils';
import { getStrapi } from '../utils/strapi-ref';
import { validateCreateLocaleInput, validateUpdateLocaleInput } from '../validation/locales';
import { formatLocale } from '../domain/locale';

// Controllers stay plain objects: user extensions patch `plugin.controllers.<name>.<action>` in
// place (see __tests__/plugin-shape.test.ts), so actions read `strapi` at call time.

const { setCreatorFields } = utils;
const { ApplicationError } = utils.errors;

const sanitizeLocale = ({ strapi }: { strapi: Core.Strapi }, locale: any) => {
  const model = strapi.getModel('plugin::i18n.locale');

  return strapi.contentAPI.sanitize.output(locale, model);
};

const controller: Core.Controller = {
  async listLocales(ctx) {
    const strapi = getStrapi();
    const localesService = getService('locales', { strapi });

    const locales = await localesService.find();
    const sanitizedLocales = await sanitizeLocale({ strapi }, locales);

    ctx.body = await localesService.setIsDefault(sanitizedLocales);
  },

  async createLocale(ctx) {
    const strapi = getStrapi();
    const { user } = ctx.state;
    const body = ctx.request.body as any;
    const { isDefault, ...localeToCreate } = body;

    await validateCreateLocaleInput(body);

    const localesService = getService('locales', { strapi });

    const existingLocale = await localesService.findByCode(body.code);
    if (existingLocale) {
      throw new ApplicationError('This locale already exists');
    }

    const localeToPersist = setCreatorFields({ user })(formatLocale(localeToCreate));

    const locale = await localesService.create(localeToPersist, { isDefault: Boolean(isDefault) });

    if (isDefault) {
      await localesService.setDefaultLocale(locale);
    }

    const sanitizedLocale = await sanitizeLocale({ strapi }, locale);

    ctx.body = await localesService.setIsDefault(sanitizedLocale);
  },

  async updateLocale(ctx) {
    const strapi = getStrapi();
    const { user } = ctx.state;
    const { id } = ctx.params;
    const body = ctx.request.body as any;
    const { isDefault, ...updates } = body;

    await validateUpdateLocaleInput(body);

    const localesService = getService('locales', { strapi });

    const existingLocale = await localesService.findById(id);
    if (!existingLocale) {
      return ctx.notFound('locale.notFound');
    }

    const allowedParams = ['name'];
    const cleanUpdates = setCreatorFields({ user, isEdition: true })(pick(updates, allowedParams));

    const updatedLocale = await localesService.update({ id }, cleanUpdates);

    if (isDefault) {
      await localesService.setDefaultLocale(updatedLocale);
    }

    const sanitizedLocale = await sanitizeLocale({ strapi }, updatedLocale);

    ctx.body = await localesService.setIsDefault(sanitizedLocale);
  },

  async deleteLocale(ctx) {
    const strapi = getStrapi();
    const { id } = ctx.params;

    const localesService = getService('locales', { strapi });

    const existingLocale = await localesService.findById(id);
    if (!existingLocale) {
      return ctx.notFound('locale.notFound');
    }

    const defaultLocaleCode = await localesService.getDefaultLocale();
    if (existingLocale.code === defaultLocaleCode) {
      throw new ApplicationError('Cannot delete the default locale');
    }

    await localesService.delete({ id });

    const sanitizedLocale = await sanitizeLocale({ strapi }, existingLocale);

    ctx.body = await localesService.setIsDefault(sanitizedLocale);
  },
};

export default controller;
