import type { Core, Schema } from '@strapi/types';

import localizationsService from '../localizations';
import localesService from '../locales';
import contentTypesService from '../content-types';

type Deps = { strapi: Core.Strapi };

// Typed with the `{ strapi }` argument core passes to service factories.
const createLocalizations: (deps: Deps) => ReturnType<typeof localizationsService> =
  localizationsService;
const createLocales: (deps: Deps) => ReturnType<typeof localesService> = localesService;
const createContentTypes: (deps: Deps) => ReturnType<typeof contentTypesService> =
  contentTypesService;

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
} as unknown as Schema.ContentType;

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
} as unknown as Schema.ContentType;

global.strapi = {
  plugins: {
    i18n: {
      services: {},
    },
  },
  db: {
    dialect: {
      client: 'sqlite',
    },
  },
  documents: Object.assign(
    () => ({
      updateComponents: jest.fn(),
      omitComponentData: jest.fn(() => ({})),
    }),
    {
      utils: {
        transformData: jest.fn(async () => ({})),
      },
    }
  ),
} as any;

Object.assign(global.strapi.plugins.i18n.services, {
  locales: createLocales({ strapi: global.strapi }),
  'content-types': createContentTypes({ strapi: global.strapi }),
});

const { syncNonLocalizedAttributes } = createLocalizations({ strapi: global.strapi });

const findMany = jest.fn(() => [{ id: 1, locale: 'fr' }]);
const update = jest.fn();
global.strapi.db.query = () => {
  return { findMany, update } as any;
};

const defaultLocale = 'en';
describe('localizations service', () => {
  describe('syncNonLocalizedAttributes', () => {
    test('Does nothing if no localizations set', async () => {
      const entry = { id: 1, locale: 'test' };

      await syncNonLocalizedAttributes(entry, model);

      expect(findMany).not.toHaveBeenCalled();
    });

    test('Does not update if all the fields are localized', async () => {
      const entry = { id: 1, documentId: 'Doc1', locale: defaultLocale, title: 'test', stars: 100 };

      await syncNonLocalizedAttributes(entry, allLocalizedModel);

      expect(update).not.toHaveBeenCalled();
    });

    test('Does not update the current locale', async () => {
      const entry = { id: 1, documentId: 'Doc1', stars: 10, locale: defaultLocale };

      await syncNonLocalizedAttributes(entry, model);

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {},
          where: { documentId: 'Doc1', locale: { $eq: 'fr' }, publishedAt: null },
        })
      );
    });
  });
});
