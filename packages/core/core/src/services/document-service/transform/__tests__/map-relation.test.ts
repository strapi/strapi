import { mapRelation, traverseEntityRelations } from '../relations/utils/map-relation';

const mapper = mapRelation(async (relation) => {
  if (!relation) return 'default';

  if (relation.id) {
    return { ...relation, id: 'mapped' };
  }

  if (relation.documentId) {
    return { ...relation, documentId: 'mapped' };
  }

  return 'error';
});

describe('map relation', () => {
  describe('long hand', () => {
    it('long hand', async () => {
      const relation = { id: 1 };
      const expectedRelation = { set: [{ id: 'mapped' }] };
      expect(await mapper(relation)).toMatchObject(expectedRelation);

      const relationDocId = { documentId: 1 };
      const expectedRelationDocId = { set: [{ documentId: 'mapped' }] };
      expect(await mapper(relationDocId)).toMatchObject(expectedRelationDocId);
    });

    describe('connect', () => {
      it('regular connect', async () => {
        const relation = { connect: { id: 1 } };
        const expectedRelation = { connect: [{ id: 'mapped' }] };
        expect(await mapper(relation)).toMatchObject(expectedRelation);

        // It keeps the other attributes
        const relationDocId = { connect: { documentId: 1, locale: 'en' } };
        const expectedRelationDocId = { connect: [{ documentId: 'mapped' }] };
        expect(await mapper(relationDocId)).toMatchObject(expectedRelationDocId);
      });

      it('connect  array', async () => {
        const relation = {
          connect: [{ id: 1 }],
        };

        const expectedRelation = {
          connect: [{ id: 'mapped' }],
        };

        expect(await mapper(relation)).toMatchObject(expectedRelation);
      });

      it('connect map to multiple', async () => {
        const relation = {
          connect: [{ id: 1 }, { id: 1 }],
        };
        const expectedRelation = {
          connect: [{ id: 'mapped1' }, { id: 'mapped2' }, { id: 'mapped1' }, { id: 'mapped2' }],
        };

        const mapper = mapRelation(async () => {
          return [{ id: 'mapped1' }, { id: 'mapped2' }];
        });

        expect(await mapper(relation)).toMatchObject(expectedRelation);
      });
    });

    it('disconnect', async () => {
      const relation = { disconnect: { id: 1 } };
      const expectedRelation = { disconnect: [{ id: 'mapped' }] };
      expect(await mapper(relation)).toMatchObject(expectedRelation);

      const relationArray = { disconnect: [{ id: 1 }, { id: 2 }] };
      const expectedRelationArray = { disconnect: [{ id: 'mapped' }, { id: 'mapped' }] };
      expect(await mapper(relationArray)).toMatchObject(expectedRelationArray);
    });

    it('set', async () => {
      const relation = { set: { id: 1 } };
      const expectedRelation = { set: [{ id: 'mapped' }] };
      expect(await mapper(relation)).toMatchObject(expectedRelation);

      const relationArray = { set: [{ id: 1 }, { id: 2 }] };
      const expectedRelationArray = { set: [{ id: 'mapped' }, { id: 'mapped' }] };
      expect(await mapper(relationArray)).toMatchObject(expectedRelationArray);
    });
  });

  describe('short hand', () => {
    it('short hand', async () => {
      const numberRelation = 1;
      const stringRelation = '1';

      const expectedRelation = { set: [{ id: 'mapped' }] };

      expect(await mapper(numberRelation)).toMatchObject(expectedRelation);
      expect(await mapper(stringRelation)).toMatchObject(expectedRelation);
    });

    it('short hand documentId starting with a digit is not treated as an id', async () => {
      // parseInt('3d52c864df72fcc68ab62ebe', 10) === 3, which used to classify these as ids
      const documentIds = ['3d52c864df72fcc68ab62ebe', '6goibolwpjtxzlc41vx2vvqa', '1a'];

      for (const documentId of documentIds) {
        expect(await mapper(documentId)).toMatchObject({ set: [{ documentId: 'mapped' }] });
      }
    });

    it('short hand documentId that looks like a number literal is not treated as an id', async () => {
      // Number() and the global isFinite() accept these, so a looser numeric check would misclassify them
      const documentIds = ['2e10', '1e5', '0x1A'];

      for (const documentId of documentIds) {
        expect(await mapper(documentId)).toMatchObject({ set: [{ documentId: 'mapped' }] });
      }
    });

    it('short hand documentId starting with a letter is a documentId', async () => {
      expect(await mapper('pj8pkr2nd6ptpga86y3bsdan')).toMatchObject({
        set: [{ documentId: 'mapped' }],
      });
    });

    it('short hand multiple with digit-leading documentIds', async () => {
      const relation = [1, '2', '3d52c864df72fcc68ab62ebe'] as any;

      const expectedRelation = {
        set: [{ id: 'mapped' }, { id: 'mapped' }, { documentId: 'mapped' }],
      };

      expect(await mapper(relation)).toMatchObject(expectedRelation);
    });

    it('short hand multiple', async () => {
      const relation = [1, '1', { id: 1 }] as any;

      const expectedRelation = { set: [{ id: 'mapped' }, { id: 'mapped' }, { id: 'mapped' }] };

      expect(await mapper(relation)).toMatchObject(expectedRelation);
    });
  });

  it('default', async () => {
    const relation = null as any;
    const expectedRelation = 'default';

    expect(await mapper(relation)).toBe(expectedRelation);
  });
});

describe('traverseEntityRelations', () => {
  const CATEGORY_UID = 'api::category.category';

  const schema = {
    uid: 'api::article.article',
    modelType: 'contentType' as const,
    attributes: {
      // morphToOne — visitor must be skipped (inline columns, not a join table)
      related: { type: 'relation' as const, relation: 'morphToOne' as const },
      // regular relation — visitor must be called
      category: {
        type: 'relation' as const,
        relation: 'manyToOne' as const,
        target: CATEGORY_UID,
      },
    },
  };

  const options = {
    schema,
    getModel: jest.fn().mockReturnValue(null),
  };

  it('does not call visitor for morphToOne relations', async () => {
    const visitor = jest.fn();
    // null value prevents traverseEntity from recursing into the attribute
    await traverseEntityRelations(visitor, options, { related: null });
    expect(visitor).not.toHaveBeenCalled();
  });

  it('calls visitor for regular relation attributes', async () => {
    const visitor = jest.fn();
    await traverseEntityRelations(visitor, options, { category: null });
    expect(visitor).toHaveBeenCalledTimes(1);
    expect(visitor).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'category' }),
      expect.anything()
    );
  });

  it('skips morphToOne but processes other relations in the same entity', async () => {
    const visitor = jest.fn();
    await traverseEntityRelations(visitor, options, { related: null, category: null });
    // only 'category' should trigger the visitor — 'related' (morphToOne) is skipped
    expect(visitor).toHaveBeenCalledTimes(1);
    expect(visitor).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'category' }),
      expect.anything()
    );
  });
});
