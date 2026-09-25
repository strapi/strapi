import localesServiceFactory from '../locales';

const localesService = localesServiceFactory();

const fakeMetricsService = {
  sendDidUpdateI18nLocalesEvent: jest.fn(),
};

const setup = ({
  hasDuplicate,
  targetStillExists = true,
}: {
  hasDuplicate: boolean;
  targetStillExists?: boolean;
}) => {
  const locale = { id: 2, name: 'English-Jordan', code: 'en-JO' };
  const duplicate = { id: 3, name: 'English-Jordan duplicate', code: 'en-JO' };
  const trx = Symbol('trx');
  const deleteLocale = jest.fn(() => Promise.resolve(locale));
  const deleteMany = jest.fn(() => Promise.resolve([]));
  const findOne = jest.fn(({ where }: any) => {
    if (where.id === locale.id) {
      return Promise.resolve(locale);
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

  const lockedRows: Array<{ id: number }> = [];
  if (targetStillExists) {
    lockedRows.push({ id: locale.id });
    if (hasDuplicate) {
      lockedRows.push({ id: duplicate.id });
    }
  }

  const queryBuilder = {
    select: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    transacting: jest.fn(),
    forUpdate: jest.fn(),
    execute: jest.fn(() => Promise.resolve(lockedRows)),
  };
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.orderBy.mockReturnValue(queryBuilder);
  queryBuilder.transacting.mockReturnValue(queryBuilder);
  queryBuilder.forUpdate.mockReturnValue(queryBuilder);

  const transaction = jest.fn(async (handler: any) => handler({ trx }));
  const createQueryBuilder = jest.fn(() => queryBuilder);

  global.strapi = {
    db: { query, queryBuilder: createQueryBuilder, transaction },
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

  return {
    createQueryBuilder,
    deleteLocale,
    deleteMany,
    findOne,
    locale,
    queryBuilder,
    transaction,
    trx,
  };
};

describe('Locales duplicate deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps localized content when another locked locale row uses the same code', async () => {
    const { deleteLocale, deleteMany, locale, queryBuilder, transaction, trx } = setup({
      hasDuplicate: true,
    });

    const result = await localesService.delete({ id: locale.id });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(queryBuilder.where).toHaveBeenCalledWith({ code: locale.code });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('id');
    expect(queryBuilder.transacting).toHaveBeenCalledWith(trx);
    expect(queryBuilder.forUpdate).toHaveBeenCalledTimes(1);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(deleteLocale).toHaveBeenCalledWith({ where: { id: locale.id } });
    expect(result).toEqual(locale);
  });

  test('deletes localized content when the locked row is the last locale for a code', async () => {
    const { deleteLocale, deleteMany, locale, queryBuilder } = setup({ hasDuplicate: false });

    await localesService.delete({ id: locale.id });

    expect(queryBuilder.forUpdate).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { locale: locale.code } });
    expect(deleteLocale).toHaveBeenCalledWith({ where: { id: locale.id } });
  });

  test('does nothing when the target row disappeared while waiting for the code lock', async () => {
    const { deleteLocale, deleteMany, locale } = setup({
      hasDuplicate: false,
      targetStillExists: false,
    });

    const result = await localesService.delete({ id: locale.id });

    expect(result).toBeNull();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(deleteLocale).not.toHaveBeenCalled();
    expect(fakeMetricsService.sendDidUpdateI18nLocalesEvent).not.toHaveBeenCalled();
  });
});
