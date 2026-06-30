import { sumDraftCounts } from '../draft';
import { isBidirectionalManyToMany } from '../draft-relations';

describe('draft-relations utils', () => {
  describe('isBidirectionalManyToMany', () => {
    it('returns true for bidirectional manyToMany', () => {
      expect(
        isBidirectionalManyToMany({
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
          inversedBy: 'articles',
        })
      ).toBe(true);
    });

    it('returns false for unidirectional manyToMany', () => {
      expect(
        isBidirectionalManyToMany({
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
        })
      ).toBe(false);
    });
  });

  describe('sumDraftCounts', () => {
    const findMany = jest.fn();

    beforeEach(() => {
      findMany.mockReset();

      global.strapi = {
        getModel: jest.fn((uid: string) => {
          if (uid === 'api::article.article') {
            return {
              uid,
              attributes: {
                category: {
                  type: 'relation',
                  relation: 'manyToOne',
                  target: 'api::tag.tag',
                },
                tags: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::tag.tag',
                  inversedBy: 'articles',
                },
              },
            };
          }

          return {
            uid,
            attributes: {
              name: { type: 'string' },
            },
            options: { draftAndPublish: true },
          };
        }),
        db: {
          query: jest.fn(() => ({
            findMany,
          })),
        },
      } as any;
    });

    it('splits bidirectional M2M counts from xToOne counts', async () => {
      findMany.mockResolvedValue([]);

      const counts = await sumDraftCounts(
        {
          category: { count: 1 },
          tags: [
            { documentId: 'draft-tag', locale: 'en' },
            { documentId: 'another-draft-tag', locale: 'en' },
          ],
        },
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 1,
        draftM2mLinks: 2,
      });
    });

    it('ignores bidirectional M2M links to documents that already have a published version', async () => {
      findMany.mockResolvedValue([
        { documentId: 'published-tag', locale: 'en' },
        { documentId: 'another-published-tag', locale: 'en' },
      ]);

      const counts = await sumDraftCounts(
        {
          tags: [
            { documentId: 'published-tag', locale: 'en' },
            { documentId: 'another-published-tag', locale: 'en' },
            { documentId: 'draft-only-tag', locale: 'en' },
          ],
        },
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 1,
      });
    });

    it('scopes published-version checks by locale for bidirectional M2M links', async () => {
      findMany.mockResolvedValue([{ documentId: 'tag-fr', locale: 'fr' }]);

      const counts = await sumDraftCounts(
        {
          tags: [
            { documentId: 'tag-fr', locale: 'fr' },
            { documentId: 'tag-fr', locale: 'en' },
          ],
        },
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 1,
      });
    });
  });
});
