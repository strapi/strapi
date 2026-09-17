import localesServiceFactory from '../locales';

const localesService = localesServiceFactory();

const fakeMetricsService = {
  sendDidUpdateI18nLocalesEvent: jest.fn(),
};

const setup = ({ hasDuplicate }: { hasDuplicate: boolean }) => {
  const locale = { id: 2, name: 'English-Jordan', code: 'en-JO' };
  const duplicate = { id: 3, name: 'English-Jordan duplicate', code: 'en-JO' };
  const deleteLocale = jest.fn(() => Promise.resolve(locale));
  const deleteMany = jest.fn(() => Promise.resolve([]));
  const findOne = jest.fn(({ where }: any) => {
    if (where.id === locale.id) {
      return Promise.resolve(locale);
    }

    if (where.code === locale.code && where.id?.$ne === locale.id) {
      return Promise.resolve(hasDuplicate ? duplicate : null);
    }

    return Promise.resolve(null);
  });
  const isLocalizedContentType = jest.fn(() => true);
  const eventHub = { emit: jest.fn(() => Promise.resolve()) };

  const query = jest.fn((uid: string) => {
    if (uid === 'plugin::i18n.locale') {
      return { delete: deleteLocale, findOne };
    }

    return { deleteMany };
  });

  global.strapi = {
    db: { query },
    eventHub,
    log: { error: jest.fn() },
    plugins: {
      i18n: {
        services: {
          metrics: fakeMetricsService,
          'content-types': { isLocalizedContentType },
        },
      },
    },
    contentTypes: {
      'api::page.page': { uid: 'api::page.page' },
    },
  } as any;

  return { deleteLocale, deleteMany, findOne, locale };
};

describe('Locales duplicate deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps localized content when another locale row uses the same code', async () => {
    const { deleteLocale, deleteMany, findOne, locale } = setup({ hasDuplicate: true });

    const result = await localesService.delete({ id: locale.id });

    expect(findOne).toHaveBeenCalledWith({
      where: { code: locale.code, id: { $ne: locale.id } },
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(deleteLocale).toHaveBeenCalledWith({ where: { id: locale.id } });
    expect(result).toEqual(locale);
  });

  test('deletes localized content when removing the last locale row for a code', async () => {
    const { deleteLocale, deleteMany, locale } = setup({ hasDuplicate: false });

    await localesService.delete({ id: locale.id });

    expect(deleteMany).toHaveBeenCalledWith({ where: { locale: locale.code } });
    expect(deleteLocale).toHaveBeenCalledWith({ where: { id: locale.id } });
  });
});
