import { normalizeRelations } from '../normalizeRelations';

const FIXTURE_RELATIONS = {
  data: {
    pages: [
      [
        {
          id: 1,
          name: 'Relation 1',
          publishedAt: '2022-08-24T09:29:11.38',
        },

        {
          id: 2,
          name: 'Relation 2',
          publishedAt: '',
        },
      ],
    ],
  },
};

describe('normalizeRelations', () => {
  test('filters out deleted releations', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        deletions: [{ id: 1 }],
      })
    ).toStrictEqual({
      data: {
        pages: [[expect.objectContaining(FIXTURE_RELATIONS.data.pages[0][1])]],
      },
    });
  });

  test('returns empty array if all relations are deleted', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        deletions: [{ id: 1 }, { id: 2 }],
      })
    ).toStrictEqual({
      data: {
        pages: [],
      },
    });
  });

  test('add link to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        deletions: [],
        shouldAddLink: true,
        targetModel: 'something',
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({ href: '/content-manager/collectionType/something/1' }),
            expect.objectContaining({ href: '/content-manager/collectionType/something/2' }),
          ],
        ],
      },
    });
  });

  test('add isDraft attribute to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        deletions: [],
      })
    ).toStrictEqual({
      data: {
        pages: [
          [expect.objectContaining({ isDraft: false }), expect.objectContaining({ isDraft: true })],
        ],
      },
    });
  });

  test('add mainField attribute to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        deletions: [],
        mainFieldName: 'name',
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({ mainField: FIXTURE_RELATIONS.data.pages[0][0].name }),
            expect.objectContaining({ mainField: FIXTURE_RELATIONS.data.pages[0][1].name }),
          ],
        ],
      },
    });
  });
});
