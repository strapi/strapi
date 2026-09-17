import localesServiceFactory from '../locales';

const localesService = localesServiceFactory();

const fakeMetricsService = {
  sendDidUpdateI18nLocalesEvent: jest.fn(),
};

const setup = ({ duplicateCount }: { duplicateCount: number }) => {
  const locale = { id: 2, name: 'English-Jordan', code: 'en-JO' };
  const deleteLocale = jest.fn(() => Promise.resolve(locale));
  const deleteMany = jest.fn(() => Promise.resolve([]));
  const findOne = jest.fn(() => Promise.resolve(locale));
  const count = jest.fn(() => Promise.resolve(duplicateCount));
  const isLocalizedContentType = jest.fn(() => true);
  const eventHub = { emit: jest.fn(() => Promise.resolve()) };

  const query = jest.fn((uid: string) => {
    if (uid === 'plugin::i18n.locale') {
      return { count, delete: deleteLocale, findOne };
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

  return { count, deleteLocale, deleteMany, eventHub, locale };
};

describe('Locales duplicate deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps localized content when another locale row uses the same code', async () => {
    const { count, deleteLocale, deleteMany, locale } = setup({ duplicateCount: 2 });

    const result = await localesService.delete({ id: locale.id });

    expect(count).toHaveBeenCalledWith({ where: { code: locale.code } });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(deleteLocale).toHaveBeenCalledWith({ where: { id: locale.id } });
    expect(result).toEqual(locale);
  });

  test('deletes localized content when removing the last locale row for a code', async () => {
    const { deleteLocale, deleteMany, locale } = setup({ duplicateCount: 1 });

    await localesService.delete({ id: locale.id });

    expect(deleteMany).toHaveBeenCalledWith({ where: { locale: locale.code } });
    expect(deleteLocale).toHaveBeenCalledWith({ where: { id: locale.id } });
  });
});
