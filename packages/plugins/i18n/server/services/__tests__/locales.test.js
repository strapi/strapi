'use strict';

// Import the `strapi` package
const { strapi } = require('@strapi/strapi');

const fakeMetricsService = {
  sendDidInitializeEvent() {},
  sendDidUpdateI18nLocalesEvent() {},
};

const localesService = require('../locales')();

describe('Locales', () => {
  describe('setIsDefault', () => {
    test('Set isDefault to false', async () => {
      const get = jest.fn(() => Promise.resolve('en'));
      strapi.store.mockReturnValue({ get });

      const locale = {
        code: 'fr',
        name: 'French',
      };

      const enrichedLocale = await localesService.setIsDefault(locale);
      expect(enrichedLocale).toMatchObject({
        ...locale,
        isDefault: false,
      });
    });

    test('Set isDefault to true', async () => {
      const get = jest.fn(() => Promise.resolve('en'));
      strapi.store.mockReturnValue({ get });

      const locale = {
        code: 'en',
        name: 'English',
      };

      const enrichedLocale = await localesService.setIsDefault(locale);
      expect(enrichedLocale).toMatchObject({
        ...locale,
        isDefault: true,
      });
    });
  });

  describe('getDefaultLocale', () => {
    test('get default locale', async () => {
      const get = jest.fn(() => Promise.resolve('en'));
      strapi.store.mockReturnValue({ get });

      const defaultLocaleCode = await localesService.getDefaultLocale();
      expect(defaultLocaleCode).toBe('en');
    });
  });

  describe('setDefaultLocale', () => {
    test('set default locale', async () => {
      const set = jest.fn(() => Promise.resolve());
      strapi.store.mockReturnValue({ set });

      await localesService.setDefaultLocale({ code: 'fr-CA' });
      expect(set).toHaveBeenCalledWith({ key: 'default_locale', value: 'fr-CA' });
    });
  });

  describe('CRUD', () => {
    test('find', async () => {
      const locales = [{ name: 'French', code: 'fr' }];
      const findMany = jest.fn(() => Promise.resolve(locales));
      strapi.query.mockReturnValue({ findMany });

      const params = { name: { $contains: 'en' } };
      const localesFound = await localesService.find(params);

      expect(strapi.query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(findMany).toHaveBeenCalledWith({ where: params });
      expect(localesFound).toMatchObject(locales);
    });

    test('findById', async () => {
      const locale = { name: 'French', code: 'fr' };
      const findOne = jest.fn(() => Promise.resolve(locale));
      strapi.query.mockReturnValue({ findOne });

      const localeFound = await localesService.findById(1);
      expect(strapi.query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(localeFound).toMatchObject(locale);
    });

    test('findByCode', async () => {
      const locale = { name: 'French', code: 'fr' };
      const findOne = jest.fn(() => Promise.resolve(locale));
      strapi.query.mockReturnValue({ findOne });

      const localeFound = await localesService.findByCode('fr');
      expect(strapi.query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(findOne).toHaveBeenCalledWith({ where: { code: 'fr' } });
      expect(localeFound).toMatchObject(locale);
    });

    test('create', async () => {
      const locale = { name: 'French', code: 'fr' };
      const create = jest.fn(() => locale);
      strapi.query.mockReturnValue({ create });
      strapi.plugins = {
        i18n: { services: { metrics: fakeMetricsService } },
      };

      const createdLocale = await localesService.create(locale);
      expect(strapi.query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(create).toHaveBeenCalledWith({ data: locale });
      expect(createdLocale).toMatchObject(locale);
    });

    test('update', async () => {
      const locale = { name: 'French', code: 'fr' };
      const update = jest.fn(() => locale);

      strapi.query.mockReturnValue({ update });
      strapi.plugins = {
        i18n: {
          services: { metrics: fakeMetricsService },
        },
      };
      const updatedLocale = await localesService.update({ code: 'fr' }, { name: 'French' });
      expect(strapi.query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(update).toHaveBeenCalledWith({ where: { code: 'fr' }, data: { name: 'French' } });
      expect(updatedLocale).toMatchObject(locale);
    });

    test('delete', async () => {
      const locale = { name: 'French', code: 'fr' };
      const deleteFn = jest.fn(() => locale);
      const deleteMany = jest.fn(() => []);
      const findOne = jest.fn(() => locale);
      const isLocalizedContentType = jest.fn(() => true);

      strapi.query.mockReturnValue({ delete: deleteFn, findOne, deleteMany });
      strapi.contentTypes = { 'api::country.country': {} };
      strapi.plugins = {
        i18n: {
          services: {
            metrics: fakeMetricsService,
            'content-types': { isLocalizedContentType },
          },
        },
      };

      const deletedLocale = await localesService.delete({ id: 1 });
      expect(strapi.query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(deletedLocale).toMatchObject(locale);
    });

    test('delete - not found', async () => {
      const locale = { name: 'French', code: 'fr' };
      const deleteFn = jest.fn(() => locale);
      const findOne = jest.fn(() => undefined);

      strapi.query.mockReturnValue({ delete: deleteFn, findOne });
      strapi.plugins = { i18n: { services: { metrics: fakeMetricsService } } };

      const deletedLocale = await localesService.delete({ id: 1 });
      expect(strapi.query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(deleteFn).not.toHaveBeenCalled();
      expect(deletedLocale).toBeUndefined();
    });
  });

  describe('initDefaultLocale', () => {
    test('create default local if none exists', async () => {
      const count = jest.fn(() => Promise.resolve(0));
      const create = jest.fn(() => Promise.resolve());
      const set = jest.fn(() => Promise.resolve());

      strapi.query.mockReturnValue({ count, create });
      strapi.store.mockReturnValue({ set });
      strapi.plugins = {
        i18n: {
          services: {
            metrics: fakeMetricsService,
          },
        },
      };

      await localesService.initDefaultLocale();
      expect(count).toHaveBeenCalledWith();
      expect(create).toHaveBeenCalledWith({
        data: {
          name: 'English (en)',
          code: 'en',
        },
      });
      expect(set).toHaveBeenCalledWith({ key: 'default_locale', value: 'en' });
    });

    test('does not create default local if one already exists', async () => {
      const count = jest.fn(() => Promise.resolve(1));
      const create = jest.fn(() => Promise.resolve());
      const set = jest.fn(() => Promise.resolve());

      strapi.query.mockReturnValue({ count, create });
      strapi.store.mockReturnValue({ set });

      await localesService.initDefaultLocale();
      expect(count).toHaveBeenCalledWith();
      expect(create).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    });
  });
});
