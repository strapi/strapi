import {
  countLocalDraftRelations,
  getDraftRelationsPublishState,
  isBidirectionalManyToMany,
  mergeDraftRelationCounts,
  normalizeDraftRelationCounts,
  resolveDraftRelationCounts,
} from '../draftRelationCounts';

import type { ComponentsDictionary, Schema } from '../../../../hooks/useDocument';

const articleSchema = {
  attributes: {
    category: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::category.category',
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
    },
    relatedArticles: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::article.article',
    },
    meta: {
      type: 'component',
      component: 'default.meta',
      repeatable: false,
    },
    blocks: {
      type: 'dynamiczone',
      components: ['default.relation-block'],
    },
  },
} as unknown as Schema;

const components: ComponentsDictionary = {
  'default.meta': {
    attributes: {
      editor: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::author.author',
      },
    },
  } as unknown as ComponentsDictionary[string],
  'default.relation-block': {
    attributes: {
      tag: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::tag.tag',
      },
    },
  } as unknown as ComponentsDictionary[string],
};

describe('draftRelationCounts', () => {
  describe('isBidirectionalManyToMany', () => {
    it('returns true when inversedBy is set', () => {
      expect(
        isBidirectionalManyToMany({
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
          inversedBy: 'articles',
        })
      ).toBe(true);
    });

    it('returns true when mappedBy is set', () => {
      expect(
        isBidirectionalManyToMany({
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
          mappedBy: 'articles',
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

    it('returns false for non-relation attributes', () => {
      expect(isBidirectionalManyToMany({ type: 'string' })).toBe(false);
    });
  });

  describe('mergeDraftRelationCounts', () => {
    it('sums both count buckets', () => {
      expect(
        mergeDraftRelationCounts(
          { unpublishedRelations: 1, draftM2mLinks: 2 },
          { unpublishedRelations: 3, draftM2mLinks: 4 }
        )
      ).toEqual({ unpublishedRelations: 4, draftM2mLinks: 6 });
    });
  });

  describe('normalizeDraftRelationCounts', () => {
    it('returns counts from a flat payload', () => {
      expect(normalizeDraftRelationCounts({ unpublishedRelations: 2, draftM2mLinks: 1 })).toEqual({
        unpublishedRelations: 2,
        draftM2mLinks: 1,
      });
    });

    it('unwraps nested data payloads', () => {
      expect(
        normalizeDraftRelationCounts({
          data: { unpublishedRelations: 1, draftM2mLinks: 3 },
        })
      ).toEqual({
        unpublishedRelations: 1,
        draftM2mLinks: 3,
      });
    });

    it('returns empty counts for unknown payloads', () => {
      expect(normalizeDraftRelationCounts(null)).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 0,
      });
    });
  });

  describe('countLocalDraftRelations', () => {
    it('counts xToOne draft connects separately from bidirectional M2M', () => {
      const counts = countLocalDraftRelations(
        {
          category: {
            connect: [{ id: 1, status: 'draft' }],
          },
          tags: {
            connect: [
              { id: 2, status: 'draft' },
              { id: 3, status: 'draft' },
            ],
          },
          authors: {
            connect: [{ id: 4, status: 'draft' }],
          },
        },
        articleSchema,
        components,
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 2,
        draftM2mLinks: 2,
      });
    });

    it('ignores published connects and self-referential relations', () => {
      const counts = countLocalDraftRelations(
        {
          category: {
            connect: [{ id: 1, status: 'published' }],
          },
          relatedArticles: {
            connect: [{ id: 2, status: 'draft' }],
          },
        },
        articleSchema,
        components,
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 0,
      });
    });

    it('counts draft relations inside components and dynamic zones', () => {
      const counts = countLocalDraftRelations(
        {
          meta: {
            editor: {
              connect: [{ id: 1, status: 'draft' }],
            },
          },
          blocks: [
            {
              __component: 'default.relation-block',
              tag: {
                connect: [{ id: 2, status: 'draft' }],
              },
            },
          ],
        },
        articleSchema,
        components,
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 2,
        draftM2mLinks: 0,
      });
    });

    it('returns empty counts when schema has no attributes', () => {
      expect(
        countLocalDraftRelations({ title: 'hello' }, undefined, components, 'api::article.article')
      ).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 0,
      });
    });

    it('ignores relation values without connect payloads', () => {
      const counts = countLocalDraftRelations(
        {
          category: { id: 1 },
        },
        articleSchema,
        components,
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 0,
      });
    });

    it('ignores non-relation attribute values', () => {
      const schemaWithTitle = {
        attributes: {
          title: { type: 'string' },
        },
      } as unknown as Schema;

      const counts = countLocalDraftRelations(
        { title: 'hello' },
        schemaWithTitle,
        components,
        'api::article.article'
      );

      expect(counts).toEqual({
        unpublishedRelations: 0,
        draftM2mLinks: 0,
      });
    });
  });

  describe('resolveDraftRelationCounts', () => {
    it('uses local counts for new documents', () => {
      expect(
        resolveDraftRelationCounts(
          undefined,
          false,
          { unpublishedRelations: 2, draftM2mLinks: 0 },
          { unpublishedRelations: 0, draftM2mLinks: 1 }
        )
      ).toEqual({ unpublishedRelations: 2, draftM2mLinks: 0 });
    });

    it('merges local and server counts when the document is modified', () => {
      expect(
        resolveDraftRelationCounts(
          'doc-1',
          true,
          { unpublishedRelations: 1, draftM2mLinks: 1 },
          { unpublishedRelations: 2, draftM2mLinks: 1 }
        )
      ).toEqual({ unpublishedRelations: 3, draftM2mLinks: 2 });
    });

    it('uses server counts for saved unmodified documents', () => {
      expect(
        resolveDraftRelationCounts(
          'doc-1',
          false,
          { unpublishedRelations: 1, draftM2mLinks: 0 },
          { unpublishedRelations: 0, draftM2mLinks: 2 }
        )
      ).toEqual({ unpublishedRelations: 0, draftM2mLinks: 2 });
    });
  });

  describe('getDraftRelationsPublishState', () => {
    it('uses danger styling for xToOne-only draft relations', () => {
      expect(getDraftRelationsPublishState({ unpublishedRelations: 1, draftM2mLinks: 0 })).toEqual({
        hasUnpublishedRelations: true,
        hasDraftM2mLinks: false,
        hasDraftRelations: true,
        isM2mOnlyDraftRelations: false,
        dialogVariant: 'danger',
        bodyIcon: 'danger',
        confirmLabel: 'publish-without-relations',
      });
    });

    it('uses default styling for bidirectional M2M-only draft relations', () => {
      expect(getDraftRelationsPublishState({ unpublishedRelations: 0, draftM2mLinks: 2 })).toEqual({
        hasUnpublishedRelations: false,
        hasDraftM2mLinks: true,
        hasDraftRelations: true,
        isM2mOnlyDraftRelations: true,
        dialogVariant: 'default',
        bodyIcon: 'default',
        confirmLabel: 'publish',
      });
    });

    it('uses danger styling when both relation types are present', () => {
      expect(getDraftRelationsPublishState({ unpublishedRelations: 1, draftM2mLinks: 2 })).toEqual(
        expect.objectContaining({
          hasDraftRelations: true,
          isM2mOnlyDraftRelations: false,
          dialogVariant: 'danger',
          confirmLabel: 'publish-without-relations',
        })
      );
    });
  });
});
