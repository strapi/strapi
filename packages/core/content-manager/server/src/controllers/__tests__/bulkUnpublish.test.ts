// @ts-expect-error - test helper
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import controller from '../collection-types';

jest.mock('../validation', () => ({
  validateBulkActionInput: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../validation/dimensions', () => ({
  getDocumentLocaleAndStatus: jest.fn().mockResolvedValue({ locale: ['en', 'fr', 'de'] }),
}));

const createMocks = (overrides: Record<string, any> = {}) => {
  const findLocales = jest.fn();
  const unpublishMany = jest.fn().mockResolvedValue({ count: 3 });
  const cannotUnpublish = jest.fn().mockReturnValue(false);
  const cannotPublish = jest.fn().mockReturnValue(false);

  return {
    findLocales,
    unpublishMany,
    cannotUnpublish,
    cannotPublish,
    ...overrides,
  };
};

const setupStrapi = (mocks: ReturnType<typeof createMocks>) => {
  global.strapi = {
    plugins: {
      'content-manager': {
        services: {
          'permission-checker': {
            create: jest.fn().mockReturnValue({
              cannot: { unpublish: mocks.cannotUnpublish, publish: mocks.cannotPublish },
            }),
          },
          'document-manager': {
            findLocales: mocks.findLocales,
            unpublishMany: mocks.unpublishMany,
          },
        },
      },
    },
  } as any;
};

const createCtx = (overrides: Record<string, any> = {}) => {
  const ctx = createContext(
    {
      params: { model: 'test-model' },
      query: {},
      body: { documentIds: ['doc-1'] },
      ...overrides,
    },
    { state: { userAbility: {} } }
  );

  ctx.forbidden = jest.fn(() => {
    ctx.status = 403;
  });

  ctx.notFound = jest.fn(() => {
    ctx.status = 404;
  });

  return ctx;
};

describe('bulkUnpublish', () => {
  it('unpublishes each document only once when several of its locales are selected', async () => {
    // findLocales returns one published row per selected locale, all sharing the same documentId.
    const mocks = createMocks({
      findLocales: jest.fn().mockResolvedValue([
        { documentId: 'doc-1', locale: 'en', publishedAt: '2026-01-01T00:00:00.000Z' },
        { documentId: 'doc-1', locale: 'fr', publishedAt: '2026-01-01T00:00:00.000Z' },
        { documentId: 'doc-1', locale: 'de', publishedAt: '2026-01-01T00:00:00.000Z' },
      ]),
    });
    setupStrapi(mocks);

    const ctx = createCtx();
    await controller.bulkUnpublish(ctx);

    expect(mocks.unpublishMany).toHaveBeenCalledTimes(1);
    expect(mocks.unpublishMany).toHaveBeenCalledWith(['doc-1'], 'test-model', {
      locale: ['en', 'fr', 'de'],
    });
    expect(ctx.body).toEqual({ count: 3 });
  });
});
