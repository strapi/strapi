import localesServiceFactory from '../locales';

const localesService = localesServiceFactory();

const fakeMetricsService = {
  sendDidInitializeEvent() {},
  sendDidUpdateI18nLocalesEvent() {},
};

const auditMocks = () => ({
  eventHub: { emit: jest.fn(() => Promise.resolve()) },
  log: { error: jest.fn() },
});

describe('Locales', () => {
  describe('setIsDefault', () => {
    test('Set isDefault to false', async () => {
      const get = jest.fn(() => Promise.resolve('en'));
      global.strapi = { store: () => ({ get }) } as any;

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
      global.strapi = { store: () => ({ get }) } as any;

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
      global.strapi = { store: () => ({ get }) } as any;

      const defaultLocaleCode = await localesService.getDefaultLocale();
      expect(defaultLocaleCode).toBe('en');
    });
  });

  describe('setDefaultLocale', () => {
    test('set default locale', async () => {
      const set = jest.fn(() => Promise.resolve());
      const get = jest.fn(() => Promise.resolve('en'));
      const findOne = jest.fn(({ where }: any) =>
        Promise.resolve(
          where.code === 'en' ? { id: 1, code: 'en', name: 'English' } : { id: 2, code: 'fr-CA' }
        )
      );
      const { eventHub, log } = auditMocks();
      global.strapi = {
        store: () => ({ set, get }),
        db: { query: () => ({ findOne }) },
        eventHub,
        log,
      } as any;

      await localesService.setDefaultLocale({ code: 'fr-CA' });
      expect(set).toHaveBeenCalledWith({ key: 'default_locale', value: 'fr-CA' });
      expect(eventHub.emit).toHaveBeenCalledWith('locale.default.update', {
        localeId: 2,
        name: undefined,
        changes: {
          defaultLocale: { before: { id: 1, code: 'en' }, after: { id: 2, code: 'fr-CA' } },
        },
      });
    });

    test('keeps the previous code when its locale no longer exists', async () => {
      const set = jest.fn(() => Promise.resolve());
      const get = jest.fn(() => Promise.resolve('de'));
      const findOne = jest.fn(({ where }: any) =>
        Promise.resolve(where.code === 'de' ? null : { id: 2, code: 'fr-CA' })
      );
      const { eventHub, log } = auditMocks();
      global.strapi = {
        store: () => ({ set, get }),
        db: { query: () => ({ findOne }) },
        eventHub,
        log,
      } as any;

      await localesService.setDefaultLocale({ code: 'fr-CA' });
      expect(eventHub.emit).toHaveBeenCalledWith(
        'locale.default.update',
        expect.objectContaining({
          changes: {
            defaultLocale: { before: { id: null, code: 'de' }, after: { id: 2, code: 'fr-CA' } },
          },
        })
      );
    });

    test('does not emit when the default locale does not change', async () => {
      const set = jest.fn(() => Promise.resolve());
      const get = jest.fn(() => Promise.resolve('en'));
      const { eventHub, log } = auditMocks();
      global.strapi = { store: () => ({ set, get }), eventHub, log } as any;

      await localesService.setDefaultLocale({ code: 'en' });
      expect(set).toHaveBeenCalledWith({ key: 'default_locale', value: 'en' });
      expect(eventHub.emit).not.toHaveBeenCalled();
    });
  });

  describe('CRUD', () => {
    test('find', async () => {
      const locales = [{ name: 'French', code: 'fr' }];
      const findMany = jest.fn(() => Promise.resolve(locales));
      const query = jest.fn(() => ({ findMany }));
      global.strapi = { db: { query } } as any;
      const params = { name: { $contains: 'en' } };

      const localesFound = await localesService.find(params);
      expect(query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(findMany).toHaveBeenCalledWith({ where: params });
      expect(localesFound).toMatchObject(locales);
    });

    test('findById', async () => {
      const locale = { name: 'French', code: 'fr' };
      const findOne = jest.fn(() => Promise.resolve(locale));
      const query = jest.fn(() => ({ findOne }));
      global.strapi = { db: { query } } as any;

      const localeFound = await localesService.findById(1);
      expect(query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(localeFound).toMatchObject(locale);
    });

    test('findByCode', async () => {
      const locale = { name: 'French', code: 'fr' };
      const findOne = jest.fn(() => Promise.resolve(locale));
      const query = jest.fn(() => ({ findOne }));
      global.strapi = { db: { query } } as any;

      const localeFound = await localesService.findByCode('fr');
      expect(query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(findOne).toHaveBeenCalledWith({ where: { code: 'fr' } });
      expect(localeFound).toMatchObject(locale);
    });

    test('create', async () => {
      const locale = { id: 2, name: 'French', code: 'fr' };
      const create = jest.fn(() => locale);
      const query = jest.fn(() => ({ create }));
      const { eventHub, log } = auditMocks();
      global.strapi = {
        db: { query },
        eventHub,
        log,
        plugins: {
          i18n: {
            services: { metrics: fakeMetricsService },
          },
        },
      } as any;

      const createdLocale = await localesService.create(locale);
      expect(query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(create).toHaveBeenCalledWith({ data: locale });
      expect(createdLocale).toMatchObject(locale);
      expect(eventHub.emit).toHaveBeenCalledWith('locale.create', {
        localeId: 2,
        name: 'French',
        isDefault: false,
      });
    });

    test('create - records the locale as default when the caller says so', async () => {
      const locale = { id: 2, name: 'French', code: 'fr' };
      const create = jest.fn(() => locale);
      const query = jest.fn(() => ({ create }));
      const { eventHub, log } = auditMocks();
      global.strapi = {
        db: { query },
        eventHub,
        log,
        plugins: { i18n: { services: { metrics: fakeMetricsService } } },
      } as any;

      await localesService.create(locale, { isDefault: true });
      expect(eventHub.emit).toHaveBeenCalledWith('locale.create', {
        localeId: 2,
        name: 'French',
        isDefault: true,
      });
    });

    test('update', async () => {
      const locale = { id: 2, name: 'French', code: 'fr' };
      const update = jest.fn(() => locale);
      // Keyed on the query, so reading the pre-image of another locale is caught here
      // rather than silently diffing against the wrong row.
      const findOne = jest.fn(({ where }: any) =>
        Promise.resolve(
          where?.code === 'fr'
            ? { id: 2, name: 'French (old)', code: 'fr' }
            : { id: 3, name: 'Spanish', code: 'es' }
        )
      );
      const query = jest.fn(() => ({ update, findOne }));
      const { eventHub, log } = auditMocks();
      global.strapi = {
        db: { query },
        eventHub,
        log,
        plugins: {
          i18n: {
            services: { metrics: fakeMetricsService },
          },
        },
      } as any;

      const updatedLocale = await localesService.update({ code: 'fr' }, { name: 'French' });
      expect(query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(findOne).toHaveBeenCalledWith({ where: { code: 'fr' } });
      expect(update).toHaveBeenCalledWith({ where: { code: 'fr' }, data: { name: 'French' } });
      expect(updatedLocale).toMatchObject(locale);
      expect(eventHub.emit).toHaveBeenCalledWith('locale.update', {
        localeId: 2,
        name: 'French',
        changes: { name: { before: 'French (old)', after: 'French' } },
      });
    });

    test('update - does not emit when the name does not change', async () => {
      const locale = { id: 2, name: 'French', code: 'fr' };
      const update = jest.fn(() => locale);
      const findOne = jest.fn(() => Promise.resolve(locale));
      const query = jest.fn(() => ({ update, findOne }));
      const { eventHub, log } = auditMocks();
      global.strapi = {
        db: { query },
        eventHub,
        log,
        plugins: { i18n: { services: { metrics: fakeMetricsService } } },
      } as any;

      await localesService.update({ code: 'fr' }, { name: 'French' });
      expect(eventHub.emit).not.toHaveBeenCalled();
    });

    test('update - does not emit when no locale matched', async () => {
      const update = jest.fn(() => null);
      const findOne = jest.fn(() => Promise.resolve(null));
      const query = jest.fn(() => ({ update, findOne }));
      const { eventHub, log } = auditMocks();
      global.strapi = {
        db: { query },
        eventHub,
        log,
        plugins: { i18n: { services: { metrics: fakeMetricsService } } },
      } as any;

      await localesService.update({ code: 'nope' }, { name: 'French' });
      expect(eventHub.emit).not.toHaveBeenCalled();
    });

    test('delete', async () => {
      const locale = { id: 2, name: 'French', code: 'fr' };
      const deleteFn = jest.fn(() => locale);
      const deleteMany = jest.fn(() => []);
      const findOne = jest.fn(() => locale);
      const isLocalizedContentType = jest.fn(() => true);
      const query = jest.fn(() => ({ delete: deleteFn, findOne, deleteMany }));
      const { eventHub, log } = auditMocks();
      global.strapi = {
        db: { query },
        eventHub,
        log,
        plugins: {
          i18n: {
            services: { metrics: fakeMetricsService, 'content-types': { isLocalizedContentType } },
          },
        },
        contentTypes: { 'api::country.country': {} },
      } as any;

      const deletedLocale = await localesService.delete({ id: 1 });
      expect(query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(deletedLocale).toMatchObject(locale);
      expect(eventHub.emit).toHaveBeenCalledWith('locale.delete', {
        localeId: 2,
        name: 'French',
      });
    });

    test('delete - not found', async () => {
      const locale = { name: 'French', code: 'fr' };
      const deleteFn = jest.fn(() => locale);
      const findOne = jest.fn(() => undefined);
      const query = jest.fn(() => ({ delete: deleteFn, findOne }));
      const { eventHub, log } = auditMocks();
      global.strapi = {
        db: { query },
        eventHub,
        log,
        plugins: {
          i18n: {
            services: { metrics: fakeMetricsService },
          },
        },
      } as any;

      const deletedLocale = await localesService.delete({ id: 1 });
      expect(query).toHaveBeenCalledWith('plugin::i18n.locale');
      expect(deleteFn).not.toHaveBeenCalled();
      expect(deletedLocale).toBeUndefined();
      expect(eventHub.emit).not.toHaveBeenCalled();
    });
  });

  describe('initDefaultLocale', () => {
    test('create default local if none exists', async () => {
      const count = jest.fn(() => Promise.resolve(0));
      const create = jest.fn(() => Promise.resolve({ id: 1, code: 'en', name: 'English (en)' }));
      const set = jest.fn(() => Promise.resolve());
      const get = jest.fn(() => Promise.resolve(undefined));
      const findOne = jest.fn(() => Promise.resolve({ id: 1, code: 'en', name: 'English (en)' }));

      const { eventHub, log } = auditMocks();
      global.strapi = {
        db: {
          query: () => ({
            count,
            create,
            findOne,
          }),
        },
        store: () => ({
          set,
          get,
        }),
        eventHub,
        log,
        plugins: {
          i18n: {
            services: {
              metrics: fakeMetricsService,
            },
          },
        },
      } as any;

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
      const { eventHub, log } = auditMocks();

      global.strapi = {
        db: {
          query: () => ({
            count,
            create,
          }),
        },
        store: () => ({
          set,
        }),
        eventHub,
        log,
      } as any;

      await localesService.initDefaultLocale();
      expect(count).toHaveBeenCalledWith();
      expect(create).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    });
  });
});
