// @ts-expect-error - test helper
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import controller from '../collection-types';

jest.mock('../validation/dimensions', () => ({
  getDocumentLocaleAndStatus: jest.fn().mockResolvedValue({ locale: 'en', status: 'published' }),
}));

const setupStrapi = ({
  draftAndPublish,
  documents,
}: {
  draftAndPublish: boolean;
  documents: Record<string, unknown>[];
}) => {
  const findPage = jest.fn().mockResolvedValue({ results: documents, pagination: { page: 1 } });
  const getStatus = jest.fn().mockReturnValue('draft');
  const getManyAvailableStatus = jest.fn().mockResolvedValue([]);
  const sanitizedQueryRead = jest.fn().mockImplementation(async (query) => query);

  const populateBuilder = {
    populateFromQuery: jest.fn().mockReturnThis(),
    populateDeep: jest.fn().mockReturnThis(),
    countRelations: jest.fn().mockReturnThis(),
    withPopulateOverride: jest.fn().mockReturnThis(),
    build: jest.fn().mockResolvedValue({}),
  };

  global.strapi = {
    localization: { isLocalizedContentType: jest.fn().mockReturnValue(false) },
    getModel: jest.fn().mockReturnValue({
      uid: 'api::test.test',
      modelType: 'contentType',
      kind: 'collectionType',
      options: { draftAndPublish },
      attributes: {},
    }),
    plugins: {
      'content-manager': {
        services: {
          'permission-checker': {
            create: jest.fn().mockReturnValue({
              cannot: { read: jest.fn().mockReturnValue(false) },
              sanitizedQuery: { read: sanitizedQueryRead },
              sanitizeOutput: jest.fn().mockImplementation(async (doc) => doc),
            }),
          },
          'populate-builder': jest.fn().mockReturnValue(populateBuilder),
          'document-metadata': { getStatus, getManyAvailableStatus },
          'document-manager': { findPage },
        },
      },
    },
  } as any;

  return { findPage, getStatus, getManyAvailableStatus, sanitizedQueryRead };
};

const createCtx = (query: Record<string, unknown> = {}) =>
  createContext(
    { params: { model: 'api::test.test' }, query },
    { state: { userAbility: {} }, forbidden: jest.fn() }
  );

describe('collection-types find status', () => {
  it('keeps the status attribute of a model without draft and publish', async () => {
    const mocks = setupStrapi({
      draftAndPublish: false,
      documents: [{ documentId: 'doc-1', status: 'active', publishedAt: null }],
    });
    const ctx = createCtx();

    await controller.find(ctx);

    expect(mocks.getStatus).not.toHaveBeenCalled();
    expect(ctx.body.results).toEqual([
      { documentId: 'doc-1', status: 'active', publishedAt: null },
    ]);
  });

  it('computes the status of a model with draft and publish', async () => {
    const mocks = setupStrapi({
      draftAndPublish: true,
      documents: [{ documentId: 'doc-1', publishedAt: null }],
    });
    const ctx = createCtx();

    await controller.find(ctx);

    expect(mocks.getManyAvailableStatus).toHaveBeenCalled();
    expect(ctx.body.results).toEqual([{ documentId: 'doc-1', publishedAt: null, status: 'draft' }]);
  });
});
