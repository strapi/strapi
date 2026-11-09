import documentManager from '../document-manager';
import { sumDraftCounts } from '../utils/draft';
import { getDeepPopulateDraftCount } from '../utils/populate';

jest.mock('../utils/draft', () => ({
  sumDraftCounts: jest.fn(),
}));

jest.mock('../utils/populate', () => ({
  getDeepPopulateDraftCount: jest.fn(),
}));

const RELATION_LAB_UID = 'api::relation-lab.relation-lab';

describe('document-manager', () => {
  const findMany = jest.fn();
  const sumDraftCountsMock = sumDraftCounts as jest.MockedFunction<typeof sumDraftCounts>;
  const getDeepPopulateDraftCountMock = getDeepPopulateDraftCount as jest.MockedFunction<
    typeof getDeepPopulateDraftCount
  >;

  beforeEach(() => {
    findMany.mockReset();
    sumDraftCountsMock.mockReset();
    getDeepPopulateDraftCountMock.mockReturnValue({
      populate: { manyToManyBi: true },
      hasRelations: true,
    });

    global.strapi = {
      documents: jest.fn(() => ({
        findMany,
      })),
    } as any;
  });

  describe('countManyEntriesDraftRelations', () => {
    it('uses the document service so non-localized types are found despite locale=en', async () => {
      const entities = [{ documentId: 'doc-1' }, { documentId: 'doc-2' }];
      findMany.mockResolvedValue(entities);
      sumDraftCountsMock
        .mockResolvedValueOnce({ unpublishedRelations: 0, draftM2mLinks: 1 })
        .mockResolvedValueOnce({ unpublishedRelations: 1, draftM2mLinks: 0 });

      const service = documentManager({ strapi: global.strapi });
      const total = await service.countManyEntriesDraftRelations(
        ['doc-1', 'doc-2'],
        RELATION_LAB_UID,
        'en'
      );

      expect(findMany).toHaveBeenCalledWith({
        populate: { manyToManyBi: true },
        filters: { documentId: { $in: ['doc-1', 'doc-2'] } },
        locale: 'en',
        status: 'draft',
      });
      expect(total).toBe(2);
    });

    it('returns 0 when the content type has no relations to count', async () => {
      getDeepPopulateDraftCountMock.mockReturnValue({ populate: {}, hasRelations: false });

      const service = documentManager({ strapi: global.strapi });
      const total = await service.countManyEntriesDraftRelations(['doc-1'], RELATION_LAB_UID, 'en');

      expect(total).toBe(0);
      expect(findMany).not.toHaveBeenCalled();
    });
  });

  describe('publication actions without draft and publish', () => {
    const NON_DP_UID = 'api::non-dp.non-dp';

    beforeEach(() => {
      global.strapi = {
        documents: jest.fn(() => ({})),
        getModel: jest.fn(() => ({ uid: NON_DP_UID, options: { draftAndPublish: false } })),
      } as any;
    });

    it.each([
      ['publish', (service: any) => service.publish('doc-1', NON_DP_UID)],
      ['publishMany', (service: any) => service.publishMany(NON_DP_UID, ['doc-1'])],
      ['unpublish', (service: any) => service.unpublish('doc-1', NON_DP_UID)],
      ['unpublishMany', (service: any) => service.unpublishMany(['doc-1'], NON_DP_UID)],
      ['discardDraft', (service: any) => service.discardDraft('doc-1', NON_DP_UID)],
    ])('%s throws a validation error', async (_name, action) => {
      const service = documentManager({ strapi: global.strapi });

      await expect(action(service)).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Draft and publish is not enabled for this content type',
      });
      expect(global.strapi.documents).not.toHaveBeenCalled();
    });
  });

  describe('bulk actions inside one transaction', () => {
    const UID = 'api::article.article';

    const draftAndPublishStrapi = (documents: Record<string, unknown>) => {
      const transaction = jest.fn(async (callback: () => unknown) => callback());
      const strapi = {
        db: { transaction },
        documents: jest.fn(() => documents),
        getModel: jest.fn(() => ({
          uid: UID,
          options: { draftAndPublish: true },
        })),
      };

      return { strapi, transaction };
    };

    it('deletes each document on the shared transaction', async () => {
      const deleteDocument = jest.fn(async () => ({}));
      const { strapi, transaction } = draftAndPublishStrapi({ delete: deleteDocument });
      const service = documentManager({ strapi: strapi as any });

      await expect(service.deleteMany(['a', 'b'], UID, { locale: 'en' })).resolves.toEqual({
        count: 2,
      });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(deleteDocument).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ documentId: 'a', locale: 'en' })
      );
      expect(deleteDocument).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ documentId: 'b', locale: 'en' })
      );
    });

    it('publishes each document on the shared transaction', async () => {
      const publish = jest.fn(async () => ({ entries: [{ documentId: 'published' }] }));
      const { strapi, transaction } = draftAndPublishStrapi({ publish });
      const service = documentManager({ strapi: strapi as any });

      await expect(service.publishMany(UID, ['a', 'b'], 'en')).resolves.toBe(2);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(publish).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ documentId: 'a', locale: 'en', populate: {} })
      );
      expect(publish).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ documentId: 'b', locale: 'en', populate: {} })
      );
    });

    it('unpublishes each document on the shared transaction', async () => {
      const unpublish = jest.fn(async () => ({ entries: [{ documentId: 'draft' }] }));
      const { strapi, transaction } = draftAndPublishStrapi({ unpublish });
      const service = documentManager({ strapi: strapi as any });

      await expect(service.unpublishMany(['a', 'b'], UID, { locale: 'en' })).resolves.toEqual({
        count: 2,
      });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(unpublish).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ documentId: 'a', locale: 'en', populate: {} })
      );
      expect(unpublish).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ documentId: 'b', locale: 'en', populate: {} })
      );
    });
  });
});
