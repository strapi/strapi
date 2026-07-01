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
    beforeEach(() => {
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
      } as any;
    });

    it('splits bidirectional M2M counts from xToOne counts', () => {
      const counts = sumDraftCounts(
        {
          category: { count: 1 },
          tags: { count: 2 },
        },
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 1,
        draftM2mLinks: 2,
      });
    });
  });
});
