import localizationsService from '../localizations';
import localesService from '../locales';
import contentTypesService from '../content-types';

const { syncNonLocalizedAttributes } = localizationsService();
const locales = localesService();
const contentTypes = contentTypesService();

const model = {
  uid: 'test-model',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    stars: {
      type: 'integer',
    },
  },
};

const allLocalizedModel = {
  uid: 'test-model',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    stars: {
      type: 'integer',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const setGlobalStrapi = () => {
  global.strapi = {
    plugins: {
      i18n: {
        services: {
          locales,
          'content-types': contentTypes,
        },
      },
    },
    db: {
      dialect: {
        client: 'sqlite',
      },
    },
  } as any;
};

describe('localizations service', () => {
  describe('syncNonLocalizedAttributes', () => {
    test('Does nothing if no localizations set', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.query = () => {
        return { update } as any;
      };

      const entry = { id: 1, locale: 'test' };

      await syncNonLocalizedAttributes(entry, { model });

      expect(update).not.toHaveBeenCalled();
    });

    test('Does not update the current locale', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.query = () => {
        return { update } as any;
      };

      const entry = { id: 1, locale: 'test', localizations: [] };

      await syncNonLocalizedAttributes(entry, { model });

      expect(update).not.toHaveBeenCalled();
    });

    test('Does not update if all the fields are localized', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.query = () => {
        return { update } as any;
      };

      const entry = { id: 1, locale: 'test', localizations: [] };

      await syncNonLocalizedAttributes(entry, { model: allLocalizedModel });

      expect(update).not.toHaveBeenCalled();
    });

    test('Updates locales with non localized fields only', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.entityService = { update } as any;

      const entry = {
        id: 1,
        locale: 'test',
        title: 'Localized',
        stars: 1,
        localizations: [{ id: 2, locale: 'fr' }],
      };

      await syncNonLocalizedAttributes(entry, { model });

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(model.uid, 2, { data: { stars: 1 } });
    });
  });
});
