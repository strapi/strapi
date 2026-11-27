import { describe, it, test, expect, vi, beforeAll } from 'vitest';
import { enable, disable } from '../i18n';
import { createLocalizationService } from '../../services/localization';

const createDBQueryMock = () => {
  const obj = {
    deleteMany: vi.fn(() => obj),
    updateMany: vi.fn(() => obj),
  } as any;

  return vi.fn(() => obj);
};

describe('i18n - Migration - enable/disable localization on a CT', () => {
  beforeAll(() => {
    global.strapi = {
      db: {},
      localization: {
        getDefaultLocale: vi.fn(async () => 'default-locale'),
        isLocalizedContentType: vi.fn(
          (contentType) => contentType?.pluginOptions?.i18n?.localized === true
        ),
      },
    } as any;
  });

  describe('enable localization on a CT', () => {
    describe('Should not migrate', () => {
      test('non i18n => non i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = {};
        const definition = {};

        await enable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.db.query).not.toHaveBeenCalled();
      });

      test('i18n => non i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = {};

        await enable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.db.query).not.toHaveBeenCalled();
      });

      test('i18n => i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await enable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.db.query).not.toHaveBeenCalled();
      });
    });

    describe('Should migrate', () => {
      test('non i18n => i18n ', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = {};
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await enable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.localization.getDefaultLocale).toHaveBeenCalled();
        expect(strapi.db.query).toHaveBeenCalled();
      });
    });
  });

  describe('disable localization on a CT', () => {
    describe('Should not migrate', () => {
      test('non i18n => non i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = {};
        const definition = {};

        await disable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });
        expect(strapi.db.query).not.toHaveBeenCalled();
      });

      test('non i18n => i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = {};
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await disable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });
        expect(strapi.db.query).not.toHaveBeenCalled();
      });

      test('i18n => i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await disable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });
        expect(strapi.db.query).not.toHaveBeenCalled();
      });
    });

    describe('Should migrate', () => {
      test('deletes non-default rows using only relation storage installed before sync', async () => {
        strapi.db.query = createDBQueryMock();
        const deleteMany = vi.fn();
        Object.assign(strapi.db, {
          entityManager: { deleteMany },
          transaction: (run: () => Promise<void>) => run(),
          dialect: {
            schemaInspector: {
              getSchema: async () => ({
                tables: [{ name: 'existing_links', columns: [{ name: 'entity_id' }] }],
              }),
            },
          },
        });
        const previousDefinition = {
          pluginOptions: { i18n: { localized: true } },
        };
        const definition = {};

        await disable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(deleteMany).toHaveBeenCalledWith(
          'test',
          { where: { locale: { $ne: 'default-locale' } } },
          expect.any(Function)
        );
        const hasStorage = deleteMany.mock.calls[0][2];
        expect(hasStorage('existing_links', ['entity_id'])).toBe(true);
        expect(hasStorage('existing_links', ['new_column'])).toBe(false);
        expect(hasStorage('new_links', ['entity_id'])).toBe(false);
        expect(strapi.db.query('test').updateMany).toHaveBeenCalledWith({
          where: { locale: { $eq: 'default-locale' } },
          data: { locale: null },
        });
      });
    });

    describe('Should abort', () => {
      test('i18n => non i18n without a default locale', async () => {
        const query = createDBQueryMock();
        strapi.db.query = query;
        vi.mocked(strapi.localization.getDefaultLocale).mockResolvedValueOnce(null);

        await expect(
          disable({
            oldContentTypes: { test: { pluginOptions: { i18n: { localized: true } } } as any },
            contentTypes: { test: {} as any },
          })
        ).rejects.toThrow('Cannot disable localization for "test"');

        expect(query().deleteMany).not.toHaveBeenCalled();
        expect(query().updateMany).not.toHaveBeenCalled();
      });
    });
  });

  it('skips localization migrations when no provider is registered', async () => {
    strapi.localization = createLocalizationService();
    strapi.db.query = createDBQueryMock();

    const input = {
      oldContentTypes: { test: { pluginOptions: { i18n: { localized: true } } } },
      contentTypes: { test: {} },
    } as unknown as Parameters<typeof enable>[0];
    await enable(input);
    await disable(input);

    expect(strapi.db.query).not.toHaveBeenCalled();
  });
});
