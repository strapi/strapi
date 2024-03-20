import { mapRelation } from '../relations/utils/map-relation';

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

describe('traverse relation', () => {
  describe('long hand', () => {
    it('long hand', async () => {
      const relation = { id: 1 };
      const expectedRelation = { id: 'mapped' };
      expect(await mapper(relation)).toMatchObject(expectedRelation);

      const relationDocId = { documentId: 1 };
      const expectedRelationDocId = { documentId: 'mapped' };
      expect(await mapper(relationDocId)).toMatchObject(expectedRelationDocId);
    });

    describe('connect', () => {
      it('regular connect', async () => {
        const relation = { connect: { id: 1 } };
        const expectedRelation = { connect: { id: 'mapped' } };
        expect(await mapper(relation)).toMatchObject(expectedRelation);

        // It keeps the other attributes
        const relationDocId = { connect: { documentId: 1, locale: 'en' } };
        const expectedRelationDocId = { connect: { documentId: 'mapped' } };
        expect(await mapper(relationDocId)).toMatchObject(expectedRelationDocId);
      });

      it('connect before', async () => {
        const relation = {
          connect: {
            id: 1,
            position: { before: 1, locale: 'es' },
          },
        };

        const expectedRelation = {
          connect: {
            id: 'mapped',
            position: { before: 'mapped' },
          },
        };

        expect(await mapper(relation)).toMatchObject(expectedRelation);
      });

      it('connect after', async () => {
        const relation = {
          connect: {
            id: 1,
            position: { after: 1, locale: 'es' },
          },
        };

        const expectedRelation = {
          connect: {
            id: 'mapped',
            position: { after: 'mapped' },
          },
        };

        expect(await mapper(relation)).toMatchObject(expectedRelation);
      });

      it('connect before array', async () => {
        const relation = {
          connect: [
            {
              id: 1,
              position: { before: 1, locale: 'es' },
            },
          ],
        };

        const expectedRelation = {
          connect: [
            {
              id: 'mapped',
              position: { before: 'mapped', locale: 'es' },
            },
          ],
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
      const expectedRelation = { disconnect: { id: 'mapped' } };
      expect(await mapper(relation)).toMatchObject(expectedRelation);

      const relationArray = { disconnect: [{ id: 1 }, { id: 2 }] };
      const expectedRelationArray = { disconnect: [{ id: 'other' }, { id: 'other' }] };
      expect(await mapper(relationArray)).toMatchObject(expectedRelationArray);
    });

    it('set', async () => {
      const relation = { set: { id: 1 } };
      const expectedRelation = { set: { id: 'other' } };
      expect(await mapper(relation)).toMatchObject(expectedRelation);

      const relationArray = { set: [{ id: 1 }, { id: 2 }] };
      const expectedRelationArray = { set: [{ id: 'other' }, { id: 'other' }] };
      expect(await mapper(relationArray)).toMatchObject(expectedRelationArray);
    });
  });

  describe('short hand', () => {
    it('short hand', async () => {
      const numberRelation = 1;
      const stringRelation = '1';

      const expectedRelation = { id: 'mapped' };

      expect(await mapper(numberRelation)).toMatchObject(expectedRelation);
      expect(await mapper(stringRelation)).toMatchObject(expectedRelation);
    });

    it('short hand multiple', async () => {
      const relation = [1, '1', { id: 1 }] as any;

      const expectedRelation = [{ id: 'mapped' }, { id: 'mapped' }, { id: 'mapped' }];

      expect(await mapper(relation)).toMatchObject(expectedRelation);
    });
  });

  it('default', async () => {
    const relation = null as any;
    const expectedRelation = 'default';

    expect(await mapper(relation)).toBe(expectedRelation);
  });
});
