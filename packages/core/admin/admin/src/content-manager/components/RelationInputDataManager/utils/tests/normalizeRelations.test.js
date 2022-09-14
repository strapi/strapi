import { normalizeRelations } from '../normalizeRelations';

const FIXTURE_RELATIONS = {
  data: {
    pages: [
      {
        results: [
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
        modifiedData: { disconnect: [{ id: 1 }] },
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining(FIXTURE_RELATIONS.data.pages[0].results[1]),
            expect.objectContaining(FIXTURE_RELATIONS.data.pages[0].results[2]),
          ],
        ],
      },
    });
  });

  test('returns empty array if all relations are deleted', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        modifiedData: { disconnect: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      })
    ).toStrictEqual({
      data: {
        pages: [],
      },
    });
  });

  test('filter disconnected relations', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        modifiedData: { disconnect: [{ id: 2 }] },
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining(FIXTURE_RELATIONS.data.pages[0].results[0]),
            expect.objectContaining(FIXTURE_RELATIONS.data.pages[0].results[2]),
          ],
        ],
      },
    });
  });

  test('add link to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        modifiedData: { disconnect: [] },
        shouldAddLink: true,
        targetModel: 'something',
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({ href: '/content-manager/collectionType/something/1' }),
            expect.objectContaining({ href: '/content-manager/collectionType/something/2' }),
            expect.objectContaining({ href: '/content-manager/collectionType/something/3' }),
          ],
        ],
      },
    });
  });

  test('add publicationState attribute to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        modifiedData: { disconnect: [] },
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
        modifiedData: { disconnect: [] },
        mainFieldName: 'name',
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].results[0].name,
            }),
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].results[1].name,
            }),
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].results[2].name,
            }),
          ],
        ],
      },
    });
  });

  test('allows to connect new relations, eventhough pages is empty', () => {
    expect(
      normalizeRelations(
        {
          data: {
            pages: [],
          },
        },
        {
          modifiedData: { connect: [{ id: 1 }] },
        }
      )
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({
              id: 1,
            }),
          ],
        ],
      },
    });
  });
});
