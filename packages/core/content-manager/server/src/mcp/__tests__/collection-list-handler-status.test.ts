import { createCollectionListHandler } from '../handlers/collection-handlers';

jest.mock('../sanitizers/shape-relations', () => ({
  shapeRelationsForMcp: jest.fn().mockImplementation(async (_uid, doc) => doc),
}));

jest.mock('../../controllers/validation/dimensions', () => ({
  getDocumentLocaleAndStatus: jest.fn().mockResolvedValue({ locale: 'en', status: 'published' }),
}));

const setup = (draftAndPublish: boolean, documents: Record<string, unknown>[]) => {
  const getStatus = jest.fn().mockReturnValue('draft');
  const getManyAvailableStatus = jest.fn().mockResolvedValue([]);

  const populateBuilder = {
    populateFromQuery: jest.fn().mockReturnThis(),
    populateDeep: jest.fn().mockReturnThis(),
    withPopulateOverride: jest.fn().mockReturnThis(),
    build: jest.fn().mockResolvedValue({}),
  };

  global.strapi = {
    getModel: jest.fn().mockReturnValue({
      uid: 'api::test.test',
      modelType: 'contentType',
      kind: 'collectionType',
      options: { draftAndPublish },
      attributes: {},
    }),
    localization: { isLocalizedContentType: jest.fn().mockReturnValue(false) },
    plugins: {
      'content-manager': {
        services: {
          'permission-checker': {
            create: jest.fn().mockReturnValue({
              cannot: { read: jest.fn().mockReturnValue(false) },
              sanitizedQuery: { read: jest.fn().mockImplementation(async (q) => q) },
              sanitizeOutput: jest.fn().mockImplementation(async (doc) => doc),
            }),
          },
          'populate-builder': jest.fn().mockReturnValue(populateBuilder),
          'document-metadata': { getStatus, getManyAvailableStatus },
          'document-manager': {
            findPage: jest.fn().mockResolvedValue({ results: documents, pagination: {} }),
          },
        },
      },
    },
  } as any;

  return { getStatus };
};

const run = async () => {
  const handler = createCollectionListHandler('api::test.test' as any)(
    global.strapi as any,
    {
      userAbility: {},
    } as any
  );
  const result: any = await handler({ args: {} });
  return JSON.parse(result.content[0].text).results;
};

describe('MCP collection list handler status', () => {
  it('keeps the status attribute of a model without draft and publish', async () => {
    const { getStatus } = setup(false, [{ documentId: 'doc-1', status: 'active' }]);

    expect(await run()).toEqual([{ documentId: 'doc-1', status: 'active' }]);
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('computes the status of a model with draft and publish', async () => {
    setup(true, [{ documentId: 'doc-1', publishedAt: null }]);

    expect(await run()).toEqual([{ documentId: 'doc-1', publishedAt: null, status: 'draft' }]);
  });
});
