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
    const strapiMock = {
      getModel: jest.fn((uid: string) => {
        if (uid === 'api::article.article') {
          return {
            uid,
            pluginOptions: { i18n: { localized: true } },
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
              authors: {
                type: 'relation',
                relation: 'manyToMany',
                target: 'api::author.author',
                inversedBy: 'articles',
              },
            },
          };
        }

        if (uid === 'api::author.author') {
          return {
            uid,
            attributes: {
              name: { type: 'string' },
            },
            options: { draftAndPublish: true },
          };
        }

        return {
          uid,
          pluginOptions: { i18n: { localized: true } },
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

    beforeEach(() => {
      findMany.mockReset();
    });

    it('splits bidirectional M2M counts from xToOne counts', async () => {
      findMany.mockResolvedValue([]);

      const counts = await sumDraftCounts(
        strapiMock,
        {
          category: { documentId: 'draft-category', locale: 'en' },
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

    it('counts xToOne links to documents that already have a published version as published', async () => {
      findMany.mockResolvedValue([{ documentId: 'published-category', locale: 'en' }]);

      const counts = await sumDraftCounts(
        strapiMock,
        {
          category: { documentId: 'published-category', locale: 'en' },
        },
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 0,
      });
    });

    it('counts joinColumn populate shapes that omit a count property', async () => {
      findMany.mockResolvedValue([]);

      const counts = await sumDraftCounts(
        strapiMock,
        {
          category: { id: 1, documentId: 'draft-category', publishedAt: null },
        },
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 1,
        draftM2mLinks: 0,
      });
    });

    it('ignores bidirectional M2M links to documents that already have a published version', async () => {
      findMany.mockResolvedValue([
        { documentId: 'published-tag', locale: 'en' },
        { documentId: 'another-published-tag', locale: 'en' },
      ]);

      const counts = await sumDraftCounts(
        strapiMock,
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
        strapiMock,
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

    it('ignores locale when the M2M target content type is not localized', async () => {
      findMany.mockResolvedValue([{ documentId: 'published-author', locale: null }]);

      const counts = await sumDraftCounts(
        strapiMock,
        {
          authors: [{ documentId: 'published-author', locale: 'en' }],
        },
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 0,
      });
    });
  });
});
