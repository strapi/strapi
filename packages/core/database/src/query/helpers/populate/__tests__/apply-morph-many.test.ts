import applyPopulate from '../apply';

/**
 * morphMany populate (e.g. `type: 'media', multiple: true`).
 *
 * Empty collections must serialize as `[]`, matching oneToMany/manyToMany —
 * not `null` (issue #24927 symptom 2).
 *
 * Covers both morphX target branches (`morphToMany` join table and `morphToOne`
 * inverse), including the `_.isEmpty(referencedValues)` early return.
 */

jest.mock('../../transform', () => ({
  fromRow: jest.fn((_meta: unknown, row: unknown) => (row == null ? null : row)),
}));

const SOURCE_UID = 'api::article.article';
const TARGET_UID = 'plugin::upload.file';
const ATTRIBUTE_NAME = 'gallery';

const buildMorphManyAttribute = () => ({
  type: 'relation' as const,
  relation: 'morphMany' as const,
  target: TARGET_UID,
  morphBy: 'related',
});

const buildTargetMorphToMany = () => ({
  type: 'relation' as const,
  relation: 'morphToMany' as const,
  joinTable: {
    name: 'files_related_morphs',
    joinColumn: {
      name: 'file_id',
      referencedColumn: 'id',
    },
    morphColumn: {
      idColumn: {
        name: 'related_id',
        referencedColumn: 'id',
      },
      typeColumn: {
        name: 'related_type',
      },
    },
  },
});

const buildTargetMorphToOne = () => ({
  type: 'relation' as const,
  relation: 'morphToOne' as const,
  morphColumn: {
    idColumn: {
      name: 'related_id',
      referencedColumn: 'id',
    },
    typeColumn: {
      name: 'related_type',
    },
  },
});

type TargetBuilder = typeof buildTargetMorphToMany | typeof buildTargetMorphToOne;

const buildCtx = (
  joinRows: Record<string, unknown>[],
  buildTarget: TargetBuilder = buildTargetMorphToMany
) => {
  const mockQb = {
    alias: 't',
    getAlias: jest.fn().mockReturnValue('lnk'),
    init: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(joinRows),
  };

  const db = {
    metadata: {
      get: jest.fn((type: string) => {
        if (type === SOURCE_UID) {
          return {
            attributes: {
              [ATTRIBUTE_NAME]: buildMorphManyAttribute(),
            },
          };
        }
        if (type === TARGET_UID) {
          return {
            columnToAttribute: {},
            attributes: {
              related: buildTarget(),
            },
          };
        }
        return { columnToAttribute: {}, attributes: {} };
      }),
    },
    entityManager: {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    },
  };

  return {
    ctx: {
      db,
      uid: SOURCE_UID,
      qb: { state: { filters: {} } },
    },
    mockQb,
  };
};

describe('morphMany populate', () => {
  describe('morphToMany target (e.g. upload media)', () => {
    it('returns [] when an entry has no related morph rows (empty multiple media)', async () => {
      const { ctx } = buildCtx([]);

      const results: Record<string, unknown>[] = [{ id: 1 }];

      await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

      expect(results[0][ATTRIBUTE_NAME]).toEqual([]);
    });

    it('returns [] when all results have nil ids (empty referencedValues early return)', async () => {
      const { ctx, mockQb } = buildCtx([]);

      const results: Record<string, unknown>[] = [{}];

      await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

      expect(results[0][ATTRIBUTE_NAME]).toEqual([]);
      expect(mockQb.execute).not.toHaveBeenCalled();
    });

    it('returns populated rows when morph links exist', async () => {
      const fileRow = { id: 42, name: 'photo.jpg', related_id: 1, related_type: SOURCE_UID };
      const { ctx } = buildCtx([fileRow]);

      const results: Record<string, unknown>[] = [{ id: 1 }];

      await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

      expect(results[0][ATTRIBUTE_NAME]).toEqual([fileRow]);
    });

    it('returns [] for entries without matches in a mixed result set', async () => {
      const fileRow = { id: 42, name: 'photo.jpg', related_id: 1, related_type: SOURCE_UID };
      const { ctx } = buildCtx([fileRow]);

      const results: Record<string, unknown>[] = [{ id: 1 }, { id: 2 }];

      await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

      expect(results[0][ATTRIBUTE_NAME]).toEqual([fileRow]);
      expect(results[1][ATTRIBUTE_NAME]).toEqual([]);
    });
  });

  describe('morphToOne target', () => {
    it('returns [] when an entry has no related morph rows', async () => {
      const { ctx } = buildCtx([], buildTargetMorphToOne);

      const results: Record<string, unknown>[] = [{ id: 1 }];

      await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

      expect(results[0][ATTRIBUTE_NAME]).toEqual([]);
    });

    it('returns [] when all results have nil ids (empty referencedValues early return)', async () => {
      const { ctx, mockQb } = buildCtx([], buildTargetMorphToOne);

      const results: Record<string, unknown>[] = [{}];

      await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

      expect(results[0][ATTRIBUTE_NAME]).toEqual([]);
      expect(mockQb.execute).not.toHaveBeenCalled();
    });

    it('returns populated rows when morph links exist', async () => {
      const fileRow = { id: 42, name: 'photo.jpg', related_id: 1, related_type: SOURCE_UID };
      const { ctx } = buildCtx([fileRow], buildTargetMorphToOne);

      const results: Record<string, unknown>[] = [{ id: 1 }];

      await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

      expect(results[0][ATTRIBUTE_NAME]).toEqual([fileRow]);
    });
  });
});
