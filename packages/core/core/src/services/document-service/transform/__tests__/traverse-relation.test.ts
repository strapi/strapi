import { traverseRelation } from '../relations/utils/traverse-relation';

const traverser = traverseRelation({
  onShortHand: () => 2,
  onLongHand: (relation) => ({ ...relation, id: 'other' }),
  onPositionBefore: (relation) => ({ ...relation, before: 2 }),
  onPositionAfter: (relation) => ({ ...relation, after: 2 }),
  onDefault: () => 'default',
});

describe('traverse relation', () => {
  describe('long hand', () => {
    it('long hand', async () => {
      const relation = { id: 1 };
      const expectedRelation = { id: 'other' };
      expect(await traverser(relation)).toEqual(expectedRelation);

      const relationDocId = { documentId: 1 };
      const expectedRelationDocId = { documentId: 1, id: 'other' };
      expect(await traverser(relationDocId)).toEqual(expectedRelationDocId);
    });

    describe('connect', () => {
      it('regular connect', async () => {
        const relation = { connect: { id: 1 } };
        const expectedRelation = { connect: { id: 'other' } };
        expect(await traverser(relation)).toEqual(expectedRelation);

        // It keeps the other attributes
        const relationDocId = { connect: { documentId: 1, locale: 'en' } };
        const expectedRelationDocId = { connect: { documentId: 1, locale: 'en', id: 'other' } };
        expect(await traverser(relationDocId)).toEqual(expectedRelationDocId);
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
            id: 'other',
            position: { before: 2, locale: 'es' },
          },
        };

        expect(await traverser(relation)).toEqual(expectedRelation);
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
            id: 'other',
            position: { after: 2, locale: 'es' },
          },
        };

        expect(await traverser(relation)).toEqual(expectedRelation);
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
              id: 'other',
              position: { before: 2, locale: 'es' },
            },
          ],
        };

        expect(await traverser(relation)).toEqual(expectedRelation);
      });

      it('connect map to multiple', async () => {
        const relation = {
          connect: [{ id: 1 }, { id: 1 }],
        };
        const expectedRelation = {
          connect: [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 2 }],
        };

        const traverser = traverseRelation({
          onLongHand: () => [{ id: 1 }, { id: 2 }],
        });

        expect(await traverser(relation)).toEqual(expectedRelation);
      });
    });

    it('disconnect', async () => {
      const relation = { disconnect: { id: 1 } };
      const expectedRelation = { disconnect: { id: 'other' } };
      expect(await traverser(relation)).toEqual(expectedRelation);

      const relationArray = { disconnect: [{ id: 1 }, { id: 2 }] };
      const expectedRelationArray = { disconnect: [{ id: 'other' }, { id: 'other' }] };
      expect(await traverser(relationArray)).toEqual(expectedRelationArray);
    });

    it('set', async () => {
      const relation = { set: { id: 1 } };
      const expectedRelation = { set: { id: 'other' } };
      expect(await traverser(relation)).toEqual(expectedRelation);

      const relationArray = { set: [{ id: 1 }, { id: 2 }] };
      const expectedRelationArray = { set: [{ id: 'other' }, { id: 'other' }] };
      expect(await traverser(relationArray)).toEqual(expectedRelationArray);
    });
  });

  describe('short hand', () => {
    it('short hand', async () => {
      const numberRelation = 1;
      const stringRelation = '1';

      const expectedRelation = 2;

      expect(await traverser(numberRelation)).toEqual(expectedRelation);
      expect(await traverser(stringRelation)).toEqual(expectedRelation);
    });

    it('short hand multiple', async () => {
      const relation = [1, '1', { id: 1 }] as any;

      const expectedRelation = [2, 2, { id: 'other' }];

      expect(await traverser(relation)).toEqual(expectedRelation);
    });
  });

  it('default', async () => {
    const relation = null as any;
    const expectedRelation = 'default';

    expect(await traverser(relation)).toEqual(expectedRelation);
  });
});
