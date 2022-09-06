import { normalizeRelations } from '../normalizeRelations';

const FIXTURE_RELATIONS = {
  data: {
    pages: [
      {
        values: [
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

          {
            id: 3,
            name: 'Relation 3',
          },
        ],
      },
    ],
  },
};

describe('normalizeRelations', () => {
  test('filters out deleted releations', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        modifiedData: { remove: [{ id: 1 }] },
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining(FIXTURE_RELATIONS.data.pages[0].values[1]),
            expect.objectContaining(FIXTURE_RELATIONS.data.pages[0].values[2]),
          ],
        ],
      },
    });
  });

  test('returns empty array if all relations are deleted', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        modifiedData: { remove: [{ id: 1 }, { id: 2 }, { id: 3 }] },
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
        modifiedData: { remove: [] },
        shouldAddLink: true,
        targetModel: 'something',
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({ href: '/admin/content-manager/collectionType/something/1' }),
            expect.objectContaining({ href: '/admin/content-manager/collectionType/something/2' }),
            expect.objectContaining({ href: '/admin/content-manager/collectionType/something/3' }),
          ],
        ],
      },
    });
  });

  test('add publicationState attribute to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        deletions: [],
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({ publicationState: 'published' }),
            expect.objectContaining({ publicationState: 'draft' }),
            expect.objectContaining({ publicationState: false }),
          ],
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
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].values[0].name,
            }),
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].values[1].name,
            }),
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].values[2].name,
            }),
          ],
        ],
      },
    });
  });
});
