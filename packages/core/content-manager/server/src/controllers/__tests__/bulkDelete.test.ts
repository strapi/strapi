// @ts-expect-error - test helper
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import controller from '../collection-types';

jest.mock('../validation', () => ({
  validateBulkActionInput: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../validation/dimensions', () => ({
  getDocumentLocaleAndStatus: jest.fn().mockResolvedValue({ locale: 'en' }),
}));

const createMocks = (overrides: Record<string, any> = {}) => {
  const populateFromQuery = jest.fn().mockReturnThis();
  const buildPopulate = jest.fn().mockResolvedValue({});

  const findLocales = jest.fn();
  const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
  const sanitizedQueryDelete = jest.fn().mockResolvedValue({});

  const cannotDelete = jest.fn().mockReturnValue(false);

  return {
    populateFromQuery,
    buildPopulate,
    findLocales,
    deleteMany,
    sanitizedQueryDelete,
    cannotDelete,
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
              cannot: { delete: mocks.cannotDelete },
              sanitizedQuery: { delete: mocks.sanitizedQueryDelete },
            }),
          },
          'populate-builder': () => ({
            populateFromQuery: mocks.populateFromQuery,
            build: mocks.buildPopulate,
          }),
          'document-manager': {
            findLocales: mocks.findLocales,
            deleteMany: mocks.deleteMany,
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

describe('bulkDelete', () => {
  it('deletes each document only once when draft & publish returns both draft and published rows', async () => {
    // With draft & publish enabled, findLocales returns one row per (locale, publication state),
    // so a single document yields two rows that share the same documentId.
    const mocks = createMocks({
      findLocales: jest.fn().mockResolvedValue([
        { documentId: 'doc-1', locale: 'en', publishedAt: null },
        { documentId: 'doc-1', locale: 'en', publishedAt: '2026-01-01T00:00:00.000Z' },
      ]),
    });
    setupStrapi(mocks);

    await controller.bulkDelete(createCtx());

    expect(mocks.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.deleteMany).toHaveBeenCalledWith(['doc-1'], 'test-model', { locale: 'en' });
  });
});
