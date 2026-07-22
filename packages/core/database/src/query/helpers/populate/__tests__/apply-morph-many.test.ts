import applyPopulate from '../apply';

/**
 * morphMany populate (e.g. `type: 'media', multiple: true`).
 *
 * Empty collections must serialize as `[]`, matching oneToMany/manyToMany —
 * not `null` (issue #24927 symptom 2).
 */

jest.mock('../../transform', () => ({
  fromRow: jest.fn((_meta: unknown, row: unknown) => {
    if (row == null) {
      return null;
    }
    if (Array.isArray(row)) {
      return row;
    }
    return row;
  }),
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

const buildCtx = (joinRows: Record<string, unknown>[]) => {
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
              related: buildTargetMorphToMany(),
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
  it('returns [] when an entry has no related morph rows (empty multiple media)', async () => {
    const { ctx } = buildCtx([]);

    const results: Record<string, unknown>[] = [{ id: 1 }];

    await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

    expect(results[0][ATTRIBUTE_NAME]).toEqual([]);
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
